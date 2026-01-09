
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from 'https://esm.sh/stripe@14.21.0';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// --- HELPERS ---
function mapStripeStatus(stripeStatus: string): string {
    switch (stripeStatus) {
        case 'active': return 'active';
        case 'trialing': return 'trial';
        case 'past_due': return 'past_due';
        case 'unpaid': return 'past_due';
        case 'canceled': return 'canceled';
        case 'incomplete': return 'past_due';
        case 'incomplete_expired': return 'canceled';
        case 'paused': return 'none';
        default: return 'none';
    }
}

function inferCycle(interval: string | undefined): 'monthly' | 'yearly' | 'none' {
    if (interval === 'year') return 'yearly';
    if (interval === 'month') return 'monthly';
    return 'none';
}

function isUUID(uuid: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const supabaseAdmin = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null;

  const logToDb = async (action: string, details: any, isError = false) => {
     if (!supabaseAdmin) return;
     try {
         await supabaseAdmin.from('audit_logs').insert({
             action: `EDGE_${action}`,
             actor_email: 'stripe-webhook',
             target_user_id: 'system',
             details: { ...details, is_error: isError }
         });
     } catch (e) { console.error("Logging failed", e); }
  };

  const markEventError = async (eventId: string, errorMsg: string) => {
      if (!supabaseAdmin) return;
      console.error(`Event ${eventId} Error: ${errorMsg}`);
      try {
          await supabaseAdmin.from('stripe_events')
              .update({ processing_error: errorMsg })
              .eq('id', eventId);
      } catch (e) {}
  };

  const markEventProcessed = async (eventId: string) => {
      if (!supabaseAdmin) return;
      try {
          await supabaseAdmin.from('stripe_events')
              .update({ processed_at: new Date().toISOString(), processing_error: null })
              .eq('id', eventId);
      } catch (e) {}
  };

  try {
    const signature = req.headers.get("Stripe-Signature");
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey || !signature) {
         await logToDb('CONFIG_ERROR', { message: 'Missing Secrets' }, true);
         return new Response("Config Error", { status: 500, headers: corsHeaders });
    }

    const body = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-08-16', httpClient: Stripe.createFetchHttpClient() });
    
    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
        await logToDb('SIGNATURE_ERROR', { error: err.message }, true);
        return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
    }

    console.log(`[Webhook] Processing ${event.type} (${event.id})`);

    // 1. LOG RAW EVENT with Idempotency Check (FIX 1)
    const { error: insertError } = await supabaseAdmin!.from('stripe_events').insert({
        id: event.id,
        type: event.type,
        payload: event
    });

    if (insertError) {
        // Postgres Duplicate Key Error Code: 23505
        if (insertError.code === '23505') {
            console.log(`[Webhook] Duplicate Event ${event.id}. Skipping.`);
            return new Response(JSON.stringify({ received: true, status: 'duplicate' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        console.error("Event Insert Error", insertError);
        // Continue processing even if logging fails, unless it's critical? 
        // Usually we want to persist the event before processing.
    }
    
    await logToDb('START_PROCESS', { type: event.type, id: event.id });

    // --- A. SUBSCRIPTION UPDATES ---
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created' || event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        // Find user by Stripe ID or fallback to email
        let { data: profile } = await supabaseAdmin!
            .from('profiles')
            .select('id, email')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

        if (!profile) {
            try {
                const stripeCustomer = await stripe.customers.retrieve(customerId);
                if (!stripeCustomer.deleted && stripeCustomer.email) {
                    const { data: emailProfile } = await supabaseAdmin!
                        .from('profiles')
                        .select('id, email')
                        .eq('email', stripeCustomer.email)
                        .maybeSingle();
                    
                    if (emailProfile) {
                        await supabaseAdmin!.from('profiles').update({ stripe_customer_id: customerId }).eq('id', emailProfile.id);
                        profile = emailProfile;
                    }
                }
            } catch (recoveryErr) {
                console.warn("[Webhook] Recovery failed", recoveryErr);
            }
        }

        if (profile) {
            const status = event.type === 'customer.subscription.deleted' ? 'canceled' : mapStripeStatus(sub.status);
            
            // Double Billing Prevention
            if (event.type === 'customer.subscription.created') {
                try {
                    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active' });
                    for (const otherSub of subs.data) {
                        if (otherSub.id !== sub.id) {
                            await stripe.subscriptions.cancel(otherSub.id);
                            await logToDb('AUTO_CANCEL_OLD', { old_sub: otherSub.id, new_sub: sub.id });
                        }
                    }
                } catch (e) {
                    console.error("Failed to auto-cancel old subs", e);
                }
            }

            // TIER MAPPING VIA DB TABLE
            const priceItem = sub.items.data[0]?.price;
            let newPlanTier = null;

            if (priceItem?.id) {
                const { data: mapping } = await supabaseAdmin!
                    .from('stripe_price_map')
                    .select('plan_tier')
                    .eq('price_id', priceItem.id)
                    .maybeSingle();
                
                if (mapping) {
                    newPlanTier = mapping.plan_tier;
                } else {
                    const msg = `Mapping missing for Price ID: ${priceItem.id}`;
                    await logToDb('MAPPING_MISSING', { price_id: priceItem.id });
                    await markEventError(event.id, msg);
                }
            } else {
                await markEventError(event.id, "No price item found in subscription");
            }

            const updateData: any = {
                user_id: profile.id, // Mandatory for Upsert
                stripe_subscription_id: sub.id,
                stripe_customer_id: customerId, // FIX 3: Sync Customer ID
                stripe_price_id: priceItem?.id,
                status: status,
                billing_cycle: inferCycle(priceItem?.recurring?.interval),
                current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                cancel_at_period_end: sub.cancel_at_period_end,
                canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null
            };

            if (newPlanTier) {
                updateData.plan_tier = newPlanTier;
                updateData.product_name = 'KOSMA'; 
            }

            const { error } = await supabaseAdmin!.from('licenses').upsert(updateData, { onConflict: 'user_id' });
            
            if (error) {
                await logToDb('LICENSE_UPDATE_FAIL', { user_id: profile.id, error }, true);
                await markEventError(event.id, error.message);
            } else {
                await logToDb('LICENSE_UPDATED', { user_id: profile.id, status, sub_id: sub.id, tier: newPlanTier });
                await markEventProcessed(event.id);
            }

        } else {
            const msg = `Orphan subscription: ${customerId} (No matching user)`;
            await logToDb('ORPHAN_SUB', { customer: sub.customer, sub_id: sub.id }, true);
            await markEventError(event.id, msg);
        }
    }

    // --- B. CHECKOUT SUCCESS ---
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        let userId = null;

        // FIX 4: UUID Security for metadata.user_id
        if (session.metadata?.user_id) {
             if (isUUID(session.metadata.user_id)) {
                 userId = session.metadata.user_id;
             } else {
                 await logToDb('METADATA_INVALID_UUID', { invalid_id: session.metadata.user_id }, true);
             }
        }

        // Validate Client Reference ID (Existing UUID check from previous code, kept for consistency)
        if (!userId) {
            const clientRef = session.client_reference_id;
            if (clientRef) {
                if (isUUID(clientRef)) {
                    userId = clientRef;
                } else {
                    await logToDb('CHECKOUT_INVALID_REF', { ref: clientRef, msg: 'Not a UUID' }, true);
                }
            }
        }
        
        if (!userId && session.customer_details?.email) {
             const { data: p } = await supabaseAdmin!.from('profiles').select('id').eq('email', session.customer_details.email).maybeSingle();
             userId = p?.id;
        }

        if (userId) {
            await supabaseAdmin!.from('profiles').update({ stripe_customer_id: session.customer }).eq('id', userId);
            await logToDb('CHECKOUT_LINKED', { user_id: userId, customer: session.customer });
            await markEventProcessed(event.id);
        } else {
            await logToDb('CHECKOUT_UNMAPPED', { session_id: session.id, email: session.customer_details?.email }, true);
            await markEventProcessed(event.id);
        }
    }

    // --- C. INVOICE SUCCESS ---
    if (event.type === 'invoice.payment_succeeded') {
        const inv = event.data.object;
        if (inv.billing_reason === 'subscription_create' || inv.billing_reason === 'subscription_cycle') {
            
            // FIX 2: Deduplication Check
            const { data: existing } = await supabaseAdmin!.from('invoices').select('id').eq('stripe_invoice_id', inv.id).maybeSingle();
            
            if (existing) {
                await markEventProcessed(event.id);
                console.log(`[Webhook] Invoice ${inv.id} already exists.`);
            } else {
                const { data: profile } = await supabaseAdmin!.from('profiles').select('id').eq('stripe_customer_id', inv.customer).maybeSingle();
                
                if (profile) {
                    await supabaseAdmin!.from('invoices').insert({
                        user_id: profile.id,
                        amount: inv.amount_paid / 100,
                        currency: inv.currency.toUpperCase(),
                        status: 'paid',
                        stripe_invoice_id: inv.id,
                        invoice_pdf_url: inv.invoice_pdf,
                        invoice_hosted_url: inv.hosted_invoice_url,
                        project_name: 'KOSMA Subscription'
                    });
                    await markEventProcessed(event.id);
                }
            }
        }
    }

    // --- D. CUSTOMER DETAILS ---
    if (event.type === 'customer.updated') {
        const cust = event.data.object;
        const address = cust.address || {};
        await supabaseAdmin!.from('profiles').update({
            billing_address: {
                companyName: cust.name,
                street: address.line1,
                city: address.city,
                zip: address.postal_code,
                country: address.country,
                vatId: cust.tax_ids?.data?.[0]?.value
            }
        }).eq('stripe_customer_id', cust.id);
        await markEventProcessed(event.id);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders });
  }
})
