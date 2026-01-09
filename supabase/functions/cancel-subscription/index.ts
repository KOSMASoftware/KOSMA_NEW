
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from 'https://esm.sh/stripe@14.21.0';

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", 
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Setup & Auth Check
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // FIX: Added explicit check for ANON_KEY
    if (!supabaseUrl || !serviceKey || !stripeKey || !anonKey) {
        throw new Error("Missing Configuration (Env Vars)");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Token");
    
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) throw new Error("Unauthorized");

    // 3. Get License Info (Need Stripe Sub ID)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: license, error: licError } = await supabaseAdmin
        .from('licenses')
        .select('stripe_subscription_id')
        .eq('user_id', user.id)
        .single();

    if (licError || !license?.stripe_subscription_id) {
        throw new Error("No active subscription linked to this account.");
    }

    // 4. Call Stripe API (The ONLY action this function performs)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-08-16', httpClient: Stripe.createFetchHttpClient() });
    
    console.log(`[Cancel] Requesting cancellation for Sub ID: ${license.stripe_subscription_id}`);
    
    const updatedSub = await stripe.subscriptions.update(license.stripe_subscription_id, {
        cancel_at_period_end: true
    });

    // 5. Audit Log (We allow this write for tracking purposes, but NOT license state)
    await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: user.id,
        actor_email: user.email,
        action: 'CANCEL_REQUEST_SENT',
        target_user_id: user.id,
        details: { 
            stripe_id: license.stripe_subscription_id,
            result: 'sent_to_stripe'
        }
    });

    // 6. Return Success (Frontend will now poll for the Webhook effect)
    return new Response(JSON.stringify({ 
        success: true, 
        message: "Cancellation requested. Syncing with Stripe..." 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Cancel Function Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400, // Client error usually
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})
