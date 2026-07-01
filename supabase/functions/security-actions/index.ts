import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isDev, error: rpcErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "developer",
    });
    if (rpcErr || !isDev) return json({ error: "Forbidden: developer role required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const actorId = userData.user.id;
    const actorIp = req.headers.get("x-forwarded-for") ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;

    if (action === "force_signout") {
      const target = String(body?.target_user_id ?? "");
      if (!target) return json({ error: "target_user_id required" }, 400);
      const { error } = await admin.auth.admin.signOut(target, "global");
      if (error) return json({ error: error.message }, 500);
      await admin.from("security_events").insert({
        actor_id: actorId,
        event_type: "auth.force_signout",
        severity: "high",
        target_user_id: target,
        resource: "auth.sessions",
        metadata: { scope: "global" },
        ip_address: actorIp,
        user_agent: userAgent,
      });
      return json({ ok: true });
    }

    if (action === "revoke_all_sessions") {
      // Signs everyone out by rotating each user's sessions.
      const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      let count = 0;
      for (const u of list.users) {
        const { error: soErr } = await admin.auth.admin.signOut(u.id, "global");
        if (!soErr) count++;
      }
      await admin.from("security_events").insert({
        actor_id: actorId,
        event_type: "auth.revoke_all",
        severity: "critical",
        resource: "auth.sessions",
        metadata: { affected_users: count },
        ip_address: actorIp,
        user_agent: userAgent,
      });
      return json({ ok: true, affected: count });
    }

    if (action === "run_scan") {
      // Aggregate a light-weight scan report from the database
      const findings: Array<{ level: string; code: string; message: string }> = [];

      const { data: buckets } = await admin.from("storage.buckets" as never).select("*");
      // buckets query above may fail (schema restriction); use storage API instead
      const { data: b2 } = await admin.storage.listBuckets();
      (b2 ?? []).forEach((b) => {
        if (b.public) findings.push({ level: "warn", code: "public_bucket", message: `Bucket "${b.name}" is public` });
      });

      // check tables without RLS via RPC overview
      const { data: overview } = await admin.rpc("get_security_overview");
      const tables = (overview as { tables?: Array<{ name: string; rls_enabled: boolean; policy_count: number }> })?.tables ?? [];
      tables.forEach((t) => {
        if (!t.rls_enabled) findings.push({ level: "critical", code: "rls_disabled", message: `Table ${t.name} has RLS disabled` });
        else if (t.policy_count === 0) findings.push({ level: "warn", code: "no_policies", message: `Table ${t.name} has RLS but no policies` });
      });

      await admin.from("security_events").insert({
        actor_id: actorId,
        event_type: "scan.run",
        severity: findings.some(f => f.level === "critical") ? "high" : "info",
        resource: "database",
        metadata: { finding_count: findings.length },
        ip_address: actorIp,
        user_agent: userAgent,
      });
      return json({ ok: true, findings });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});