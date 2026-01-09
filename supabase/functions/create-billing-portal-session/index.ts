
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import Stripe from 'https://esm.sh/stripe@14.21.0';

declare const Deno: any;

const allowedOrigins = new Set([
  "https://kosma.io",
  "https://www.kosma.io",
  "https://kosma-lake.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
]);

function cors(origin: string | null) {
  const o = origin && allowedOrigins.has(origin) ? origin : "https://kosma.io";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors(origin) });
  }

  try {
    // ENV VARS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!supabaseUrl || !anonKey || !serviceKey || !stripeKey) {
         throw new Error("Missing one or more required environment variables.");
    }

    // 1. AUTH CHECK
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing auth token" }), { status: 401, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace("Bearer ", "");
    
    // VALIDATE USER JWT
    const supabaseAuth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
    }

    // 2. GET CUSTOMER ID (USE SERVICE ROLE & CORRECT TABLE)
    // FIX: Look in 'profiles' table, not 'licenses'. The profile is the anchor for the customer identity.
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    
    const { data: profile, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

    if (profError || !profile?.stripe_customer_id) {
         return new Response(JSON.stringify({ error: "No active billing account found. Please subscribe first." }), { status: 404, headers: { ...cors(origin), 'Content-Type': 'application/json' } });
    }

    // 3. VALIDATE RETURN URL
    const { returnUrl } = await req.json();
    let safeReturnUrl = 'https://kosma.io/dashboard/settings';
    
    if (returnUrl) {
        try {
            const urlObj = new URL(returnUrl);
            if (allowedOrigins.has(urlObj.origin)) {
                safeReturnUrl = returnUrl;
            }
        } catch (e) {
            console.warn("Invalid returnUrl provided, using fallback.");
        }
    }

    // 4. CREATE STRIPE PORTAL SESSION
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-08-16', httpClient: Stripe.createFetchHttpClient() });
    
    const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: safeReturnUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...cors(origin), 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Portal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...cors(origin), 'Content-Type': 'application/json' }
    });
  }
})
