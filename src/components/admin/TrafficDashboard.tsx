import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Users, Eye, Clock, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

type Stats = {
  since: string;
  days: number;
  summary: {
    total_visits: number;
    unique_sessions: number;
    unique_users: number;
    visits_24h: number;
    visits_1h: number;
  };
  daily: { day: string; visits: number; sessions: number }[];
  top_pages: { path: string; visits: number }[];
  top_referrers: { referrer: string; visits: number }[];
  devices: { device: string; visits: number }[];
};

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#6366f1", "#ef4444"];

export default function TrafficDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await (supabase.rpc as any)("get_traffic_stats", { _days: days });
    if (error) {
      setError(error.message);
      setStats(null);
    } else {
      setStats(data as Stats);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-foreground">Traffic Pengunjung</h3>
          <p className="text-xs text-muted-foreground">Statistik kunjungan halaman situs.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {d} hari
            </button>
          ))}
          <button onClick={load} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80">
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> <span className="ml-2 text-sm">Memuat data...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {!loading && stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: "Total Kunjungan", value: stats.summary.total_visits, icon: Eye },
              { label: "Sesi Unik", value: stats.summary.unique_sessions, icon: Activity },
              { label: "User Login", value: stats.summary.unique_users, icon: Users },
              { label: "24 Jam", value: stats.summary.visits_24h, icon: Clock },
              { label: "1 Jam", value: stats.summary.visits_1h, icon: Clock },
            ].map((s, i) => (
              <div key={i} className="rounded-xl bg-card p-4 shadow-card">
                <s.icon className="h-5 w-5 text-primary" />
                <p className="mt-2 font-display text-xl font-bold text-foreground tabular-nums">{s.value.toLocaleString("id-ID")}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-card p-4 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Kunjungan Harian</h4>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="visits" stroke="hsl(var(--primary))" name="Kunjungan" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="sessions" stroke="#f59e0b" name="Sesi" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-4 shadow-card">
              <h4 className="text-sm font-semibold text-foreground mb-3">Halaman Populer</h4>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.top_pages} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis dataKey="path" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl bg-card p-4 shadow-card">
              <h4 className="text-sm font-semibold text-foreground mb-3">Perangkat</h4>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={stats.devices} dataKey="visits" nameKey="device" outerRadius={90} label>
                      {stats.devices.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-card p-4 shadow-card">
            <h4 className="text-sm font-semibold text-foreground mb-3">Sumber Referrer Teratas</h4>
            <div className="space-y-2">
              {stats.top_referrers.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada data.</p>
              )}
              {stats.top_referrers.map((r, i) => {
                const max = stats.top_referrers[0]?.visits || 1;
                const pct = (r.visits / max) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-48 truncate text-xs text-foreground" title={r.referrer}>{r.referrer}</div>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-12 text-right text-xs text-muted-foreground tabular-nums">{r.visits}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}