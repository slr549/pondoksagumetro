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

    const paymentOrderId = `ORDER-${order.id}-${Date.now()}`;

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