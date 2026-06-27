import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const payload = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;

    // Validasi field wajib dari Midtrans
    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return new Response(
        JSON.stringify({ error: "Missing required webhook fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ambil Server Key dari env (wajib di-set di Supabase Secrets)
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY is not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validasi Signature menggunakan Web Crypto API (SHA-512)
    const encoder = new TextEncoder();
    const data = encoder.encode(order_id + status_code + gross_amount + serverKey);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);

    // Convert ArrayBuffer ke hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== signature_key) {
      console.error("Invalid signature key detected for order:", order_id);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tentukan status baru berdasarkan transaction_status dari Midtrans
    let newStatus = 'pending';
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      newStatus = 'confirmed';
    } else if (['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)) {
      newStatus = 'cancelled';
    }

    // Inisialisasi Supabase Client dengan Service Role Key (bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase env vars missing");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update status order di database
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order_id);

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log(`Order ${order_id} updated to status: ${newStatus}`);

    return new Response(
      JSON.stringify({ message: "Webhook accepted and processed", order_id, status: newStatus }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error('Webhook overall error:', err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
