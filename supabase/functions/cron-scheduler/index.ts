
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // POINT 6: CRON Secret Validation
    const authHeader = req.headers.get('x-cron-secret');
    const cronSecret = Deno.env.get('CRON_SECRET');
    
    if (!cronSecret || authHeader !== cronSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
         throw new Error("Missing credentials");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Call the SQL function 'expire_trials'
    const { error } = await supabaseAdmin.rpc('expire_trials');

    if (error) {
        throw error;
    }

    return new Response(JSON.stringify({ success: true, message: "Expired trials processed." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
