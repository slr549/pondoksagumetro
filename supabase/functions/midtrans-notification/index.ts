import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha512(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-512", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body ?? {};

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
    const expected = await sha512(
      `${order_id}${status_code}${gross_amount}${serverKey}`,
    );
    if (expected !== signature_key) {
      console.warn("Invalid Midtrans signature for", order_id);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map Midtrans status -> our internal status
    let paymentStatus = transaction_status as string;
    let orderStatus: string | null = null;
    let paidAt: string | null = null;

    if (
      transaction_status === "capture" ||
      transaction_status === "settlement"
    ) {
      if (fraud_status && fraud_status !== "accept") {
        paymentStatus = "challenge";
      } else {
        paymentStatus = "settlement";
        orderStatus = "confirmed";
        paidAt = new Date().toISOString();
      }
    } else if (
      ["cancel", "deny", "expire", "failure"].includes(transaction_status)
    ) {
      orderStatus = "cancelled";
    } else if (transaction_status === "pending") {
      paymentStatus = "pending";
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const update: Record<string, unknown> = { payment_status: paymentStatus };
    if (orderStatus) update.status = orderStatus;
    if (paidAt) update.paid_at = paidAt;

    const { error } = await supabase
      .from("orders")
      .update(update)
      .eq("payment_order_id", order_id);

    if (error) {
      console.error("DB update error:", error);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});