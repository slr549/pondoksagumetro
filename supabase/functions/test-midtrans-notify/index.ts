// Temporary helper to simulate a signed Midtrans webhook for sandbox testing.
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
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const { order_id, gross_amount, transaction_status } = await req.json();
    const status_code = transaction_status === "settlement" ? "200" : "201";
    const signature_key = await sha512(
      `${order_id}${status_code}${gross_amount}${serverKey}`,
    );
    const payload = {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status: "accept",
    };
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/midtrans-notification`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return new Response(
      JSON.stringify({ status: res.status, response: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});