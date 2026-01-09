import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS (Browser requests)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { check } = await req.json()
    const start = performance.now()

    // --- CHECK STRIPE ---
    if (check === 'stripe') {
        // Deno.env.get funktioniert direkt im Supabase Dashboard Editor
        const stripeKey = (Deno as any).env.get('STRIPE_SECRET_KEY')
        
        if (!stripeKey) {
            throw new Error('STRIPE_SECRET_KEY is missing in Secrets')
        }

        const response = await fetch('https://api.stripe.com/v1/balance', {
            headers: { 'Authorization': `Bearer ${stripeKey}` }
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(`Stripe Error (${response.status}): ${err.error?.message || response.statusText}`)
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Stripe Connection OK',
            apiLatency: Math.round(performance.now() - start)
        }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    // --- CHECK EMAIL ---
    if (check === 'email') {
        const emailKey = (Deno as any).env.get('ELASTIC_EMAIL_API_KEY')
        
        if (!emailKey) {
            throw new Error('ELASTIC_EMAIL_API_KEY is missing in Secrets')
        }

        const response = await fetch(`https://api.elasticemail.com/v2/account/load?apikey=${emailKey}`)
        const data = await response.json().catch(() => null)

        if (!data || data.success === false) {
             throw new Error(`Elastic Email Error: ${data?.error || 'Unknown API Error'}`)
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Email Service OK',
            apiLatency: Math.round(performance.now() - start)
        }), { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        })
    }

    throw new Error(`Unknown check: ${check}`)

  } catch (error: any) {
    // WICHTIG: Wir senden Status 200 (OK) zurück, auch bei Fehlern.
    return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
    })
  }
})