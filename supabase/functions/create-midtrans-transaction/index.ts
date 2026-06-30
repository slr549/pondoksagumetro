<<<<<<< HEAD
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
=======
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Switch to "https://app.midtrans.com/snap/v1/transactions" for production
const MIDTRANS_SNAP_URL =
  "https://app.sandbox.midtrans.com/snap/v1/transactions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) {
      return new Response(
        JSON.stringify({ error: "MIDTRANS_SERVER_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load the order + items from DB (do NOT trust client-provided amount)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, customer_name, customer_phone, total_price")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("product_id, product_name, quantity, price_at_purchase")
      .eq("order_id", orderId);

    // Midtrans limits transaction_details.order_id to 50 characters.
    // Use the short order id prefix + timestamp suffix to stay well under the cap.
    const shortId = order.id.replace(/-/g, "").slice(0, 20);
    const paymentOrderId = `OD-${shortId}-${Date.now()}`;

    const payload = {
      transaction_details: {
        order_id: paymentOrderId,
        gross_amount: order.total_price,
      },
      customer_details: {
        first_name: order.customer_name,
        phone: order.customer_phone,
      },
      item_details: (items ?? []).map((i) => ({
        id: i.product_id ?? "item",
        name: i.product_name.slice(0, 50),
        price: i.price_at_purchase,
        quantity: i.quantity,
      })),
    };

    const auth = btoa(`${serverKey}:`);
    const res = await fetch(MIDTRANS_SNAP_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Midtrans error:", data);
      return new Response(JSON.stringify({ error: "Midtrans error", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist token + payment ref on the order
    await supabase
      .from("orders")
      .update({
        payment_token: data.token,
        payment_order_id: paymentOrderId,
        payment_status: "pending",
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ token: data.token, redirect_url: data.redirect_url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
>>>>>>> f0988ccde38d7e33e8ebdfc6433d9813c2f45656
