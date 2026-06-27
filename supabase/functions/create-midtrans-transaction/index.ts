import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, total_price, customer_name, customer_phone, items } = await req.json();

    if (!order_id || !total_price) {
      throw new Error("Missing required parameters: order_id and total_price are required");
    }

    // Ambil Server Key dari Supabase Secrets (wajib di-set via dashboard/CLI)
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) {
      throw new Error("MIDTRANS_SERVER_KEY environment variable is not set");
    }

    const base64Key = btoa(`${serverKey}:`);

    const midtransPayload = {
      transaction_details: {
        order_id: order_id.toString(),
        gross_amount: Math.round(total_price),
      },
      customer_details: {
        first_name: customer_name || "Pelanggan",
        phone: customer_phone || "",
      },
      item_details: Array.isArray(items)
        ? items.map((item: any) => ({
            id: item.product_id?.toString() || "item",
            price: Math.round(item.price_at_purchase),
            quantity: item.quantity,
            name: (item.product_name || "Produk").substring(0, 50),
          }))
        : [],
    };

    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Basic ${base64Key}`,
      },
      body: JSON.stringify(midtransPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error_messages
        ? data.error_messages.join(", ")
        : `Midtrans error: ${response.status}`;
      throw new Error(errMsg);
    }

    return new Response(
      JSON.stringify({ token: data.token, redirect_url: data.redirect_url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("create-midtrans-transaction error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
