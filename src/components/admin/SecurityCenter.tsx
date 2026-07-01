import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, ShieldAlert, ShieldCheck, RefreshCw, Play, LogOut, AlertTriangle, Users, Lock, Database, Activity } from "lucide-react";

type TableInfo = { name: string; rls_enabled: boolean; policy_count: number };
type BucketInfo = { name: string; public: boolean };
type SecEvent = {
  id: string;
  created_at: string;
  event_type: string;
  severity: string;
  actor_email: string | null;
  target_email: string | null;
  resource: string | null;
  metadata: Record<string, unknown>;
};
type Overview = {
  generated_at: string;
  users: { total_users: number; verified_users: number; active_24h: number; new_7d: number };
  roles: Record<string, number>;
  tables: TableInfo[];
  buckets: BucketInfo[];
  recent_events: SecEvent[];
  event_counts_7d: Record<string, number>;
};

type ScanFinding = { level: string; code: string; message: string };

const severityStyle = (s: string) => {
  switch (s) {
    case "critical": return "bg-destructive/20 text-destructive border-destructive/40";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    case "warn": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    default: return "bg-secondary text-muted-foreground border-border";
  }
};

export default function SecurityCenter() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [findings, setFindings] = useState<ScanFinding[] | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_security_overview");
    if (error) toast.error("Gagal memuat security overview: " + error.message);
    else setOverview(data as unknown as Overview);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runScan = async () => {
    setScanning(true);
    setFindings(null);
    const { data, error } = await supabase.functions.invoke("security-actions", {
      body: { action: "run_scan" },
    });
    setScanning(false);
    if (error) { toast.error("Scan gagal: " + error.message); return; }
    const res = data as { findings?: ScanFinding[] };
    setFindings(res?.findings ?? []);
    toast.success(`Scan selesai: ${res?.findings?.length ?? 0} temuan.`);
    load();
  };

  const revokeAll = async () => {
    if (!confirm("Paksa sign-out SEMUA pengguna? Ini akan mengakhiri semua sesi aktif.")) return;
    setBusyAction(true);
    const { data, error } = await supabase.functions.invoke("security-actions", {
      body: { action: "revoke_all_sessions" },
    });
    setBusyAction(false);
    if (error) { toast.error("Gagal: " + error.message); return; }
    toast.success(`Berhasil menghentikan sesi ${(data as { affected?: number })?.affected ?? 0} pengguna.`);
    load();
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground text-sm py-8"><RefreshCw className="h-4 w-4 animate-spin" /> Memuat Security Center...</div>;
  }
  if (!overview) return null;

  const rlsDisabled = overview.tables.filter(t => !t.rls_enabled);
  const noPolicies = overview.tables.filter(t => t.rls_enabled && t.policy_count === 0);
  const publicBuckets = overview.buckets.filter(b => b.public);
  const riskScore = rlsDisabled.length * 3 + noPolicies.length * 1 + publicBuckets.length * 1;
  const riskLabel = riskScore === 0 ? "Sehat" : riskScore < 3 ? "Rendah" : riskScore < 8 ? "Sedang" : "Tinggi";
  const riskColor = riskScore === 0 ? "text-green-400" : riskScore < 3 ? "text-blue-400" : riskScore < 8 ? "text-yellow-400" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Security Center
          </h2>
          <p className="text-xs text-muted-foreground">Khusus Developer · Diperbarui {new Date(overview.generated_at).toLocaleString("id-ID")}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-3.5 w-3.5" /> Refresh</Button>
          <Button size="sm" onClick={runScan} disabled={scanning}>
            {scanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Jalankan Scan
          </Button>
        </div>
      </div>

      {/* Risk summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Risk Score" value={<span className={riskColor}>{riskLabel} ({riskScore})</span>} />
        <StatCard icon={Users} label="Total User" value={overview.users.total_users} sub={`${overview.users.verified_users} terverifikasi`} />
        <StatCard icon={Activity} label="Aktif 24 jam" value={overview.users.active_24h} sub={`+${overview.users.new_7d} baru 7 hari`} />
        <StatCard icon={Lock} label="Admin & Dev" value={(overview.roles.admin ?? 0) + (overview.roles.developer ?? 0)} sub={`admin ${overview.roles.admin ?? 0} · dev ${overview.roles.developer ?? 0}`} />
      </div>

      {/* Auto Findings */}
      <section className="rounded-xl bg-card p-4 shadow-card">
        <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-400" /> Temuan Otomatis</h3>
        <div className="space-y-2">
          {rlsDisabled.length === 0 && noPolicies.length === 0 && publicBuckets.length === 0 && (
            <p className="text-xs text-green-400">✓ Tidak ada masalah RLS/bucket kritis terdeteksi.</p>
          )}
          {rlsDisabled.map(t => (
            <FindingRow key={t.name} level="critical" text={`Tabel ${t.name}: RLS DINONAKTIFKAN`} />
          ))}
          {noPolicies.map(t => (
            <FindingRow key={t.name} level="warn" text={`Tabel ${t.name}: RLS aktif tapi tanpa policy (locked)`} />
          ))}
          {publicBuckets.map(b => (
            <FindingRow key={b.name} level="warn" text={`Bucket ${b.name} bersifat publik`} />
          ))}
        </div>
        {findings && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Hasil scan terakhir:</p>
            {findings.length === 0 && <p className="text-xs text-green-400">✓ Bersih.</p>}
            {findings.map((f, i) => <FindingRow key={i} level={f.level} text={f.message} />)}
          </div>
        )}
      </section>

      {/* Tables & RLS */}
      <section className="rounded-xl bg-card p-4 shadow-card">
        <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Status RLS per Tabel</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground text-left">
              <tr><th className="py-1.5">Tabel</th><th>RLS</th><th>Policies</th></tr>
            </thead>
            <tbody>
              {overview.tables.map(t => (
                <tr key={t.name} className="border-t border-border">
                  <td className="py-1.5 font-mono">{t.name}</td>
                  <td>{t.rls_enabled
                    ? <span className="text-green-400">✓ ON</span>
                    : <span className="text-destructive font-semibold">✗ OFF</span>}</td>
                  <td className={t.policy_count === 0 ? "text-yellow-400" : "text-foreground"}>{t.policy_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit log */}
      <section className="rounded-xl bg-card p-4 shadow-card">
        <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" /> Audit Log (25 terbaru)
          <span className="ml-auto flex gap-1.5">
            {Object.entries(overview.event_counts_7d).map(([sev, n]) => (
              <span key={sev} className={`rounded-md border px-1.5 py-0.5 text-[10px] ${severityStyle(sev)}`}>{sev}: {n}</span>
            ))}
          </span>
        </h3>
        {overview.recent_events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada aktivitas keamanan tercatat.</p>
        ) : (
          <div className="space-y-1.5">
            {overview.recent_events.map(e => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 px-3 py-2 text-xs">
                <span className={`rounded-md border px-1.5 py-0.5 text-[10px] uppercase font-semibold ${severityStyle(e.severity)}`}>{e.severity}</span>
                <span className="font-mono text-foreground">{e.event_type}</span>
                {e.actor_email && <span className="text-muted-foreground">oleh <span className="text-foreground">{e.actor_email}</span></span>}
                {e.target_email && <span className="text-muted-foreground">→ <span className="text-foreground">{e.target_email}</span></span>}
                {e.metadata && Object.keys(e.metadata).length > 0 && (
                  <span className="text-muted-foreground font-mono truncate max-w-xs">{JSON.stringify(e.metadata)}</span>
                )}
                <span className="ml-auto text-muted-foreground tabular-nums">{new Date(e.created_at).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h3 className="font-display text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Zona Berbahaya
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Tindakan ini akan mempengaruhi semua pengguna. Gunakan hanya saat terjadi insiden.</p>
        <Button variant="destructive" size="sm" onClick={revokeAll} disabled={busyAction}>
          <LogOut className="h-3.5 w-3.5" /> Cabut Semua Sesi (Global Sign-Out)
        </Button>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Shield; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function FindingRow({ level, text }: { level: string; text: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${severityStyle(level)}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </div>
  );
}