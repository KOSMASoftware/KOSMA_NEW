
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Simple CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Just log the request. We DO NOT write to the DB here.
    // We rely 100% on the async stripe-webhook to preserve data integrity.
    const { tier, cycle } = await req.json()
    console.log(`[Frontend Return] User returned from checkout for: ${tier} / ${cycle}. Waiting for Webhook.`)

    return new Response(JSON.stringify({ success: true, message: "Acknowledged. Frontend should poll for webhook results." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
