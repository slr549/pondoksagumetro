import { useMemo, useState } from "react";
import { formatPrice } from "@/data/products";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Package, Clock, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrderAnalyticsProps {
  orders: any[];
  products: any[];
}

const COLORS = [
  "hsl(140, 70%, 45%)",
  "hsl(200, 70%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(30, 80%, 55%)",
  "hsl(350, 65%, 50%)",
];

export default function OrderAnalytics({ orders, products }: OrderAnalyticsProps) {
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("30d");

  const filteredOrders = useMemo(() => {
    if (period === "all") return orders;
    const days = period === "7d" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return orders.filter((o) => new Date(o.created_at) >= cutoff);
  }, [orders, period]);

  // Revenue by day
  const revenueByDay = useMemo(() => {
    const map = new Map<string, { revenue: number; orders: number }>();
    filteredOrders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const day = new Date(o.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        const existing = map.get(day) || { revenue: 0, orders: 0 };
        map.set(day, { revenue: existing.revenue + o.total_price, orders: existing.orders + 1 });
      });
    return Array.from(map, ([name, data]) => ({ name, ...data }));
  }, [filteredOrders]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach((o) => {
      map.set(o.status, (map.get(o.status) || 0) + 1);
    });
    const labels: Record<string, string> = {
      pending: "Pending",
      confirmed: "Dikonfirmasi",
      ready_for_pickup: "Siap Ambil",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    };
    return Array.from(map, ([status, value]) => ({ name: labels[status] || status, value }));
  }, [filteredOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; revenue: number }>();
    filteredOrders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        (o.order_items || []).forEach((item: any) => {
          const existing = map.get(item.product_name) || { qty: 0, revenue: 0 };
          map.set(item.product_name, {
            qty: existing.qty + item.quantity,
            revenue: existing.revenue + item.price_at_purchase * item.quantity,
          });
        });
      });
    return Array.from(map, ([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  // Summary stats
  const stats = useMemo(() => {
    const valid = filteredOrders.filter((o) => o.status !== "cancelled");
    const totalRevenue = valid.reduce((s, o) => s + o.total_price, 0);
    const avgOrderValue = valid.length ? Math.round(totalRevenue / valid.length) : 0;
    const completedCount = filteredOrders.filter((o) => o.status === "completed").length;
    const pendingCount = filteredOrders.filter((o) => o.status === "pending").length;
    return { totalRevenue, avgOrderValue, totalOrders: filteredOrders.length, completedCount, pendingCount };
  }, [filteredOrders]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
    const periodLabel = period === "7d" ? "7 Hari Terakhir" : period === "30d" ? "30 Hari Terakhir" : "Semua Waktu";

    doc.setFontSize(18);
    doc.text("Laporan Analitik Pesanan", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${periodLabel} — Dicetak: ${now}`, 14, 28);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Ringkasan", 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [["Total Revenue", "Total Pesanan", "Rata-rata Order", "Menunggu"]],
      body: [[formatPrice(stats.totalRevenue), String(stats.totalOrders), formatPrice(stats.avgOrderValue), String(stats.pendingCount)]],
      theme: "grid",
      headStyles: { fillColor: [34, 139, 34] },
    });

    // Revenue by day
    const tableEnd1 = (doc as any).lastAutoTable?.finalY || 60;
    doc.setFontSize(12);
    doc.text("Revenue Harian", 14, tableEnd1 + 10);
    if (revenueByDay.length > 0) {
      autoTable(doc, {
        startY: tableEnd1 + 14,
        head: [["Tanggal", "Revenue", "Jumlah Pesanan"]],
        body: revenueByDay.map((r) => [r.name, formatPrice(r.revenue), String(r.orders)]),
        theme: "striped",
        headStyles: { fillColor: [34, 139, 34] },
      });
    }

    // Top products
    const tableEnd2 = (doc as any).lastAutoTable?.finalY || tableEnd1 + 20;
    doc.setFontSize(12);
    doc.text("Produk Terlaris", 14, tableEnd2 + 10);
    if (topProducts.length > 0) {
      autoTable(doc, {
        startY: tableEnd2 + 14,
        head: [["Produk", "Qty Terjual", "Revenue"]],
        body: topProducts.map((p) => [p.name, String(p.qty), formatPrice(p.revenue)]),
        theme: "striped",
        headStyles: { fillColor: [34, 139, 34] },
      });
    }

    // Status breakdown
    const tableEnd3 = (doc as any).lastAutoTable?.finalY || tableEnd2 + 20;
    doc.setFontSize(12);
    doc.text("Status Pesanan", 14, tableEnd3 + 10);
    if (ordersByStatus.length > 0) {
      autoTable(doc, {
        startY: tableEnd3 + 14,
        head: [["Status", "Jumlah"]],
        body: ordersByStatus.map((s) => [s.name, String(s.value)]),
        theme: "striped",
        headStyles: { fillColor: [34, 139, 34] },
      });
    }

    doc.save(`laporan-analitik-${period}.pdf`);
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "hsl(220, 20%, 12%)",
      border: "1px solid hsl(220, 20%, 20%)",
      borderRadius: "8px",
      color: "hsl(220, 15%, 90%)",
      fontSize: "12px",
    },
    labelStyle: { color: "hsl(220, 15%, 90%)" },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Analitik Pesanan</h3>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {([["7d", "7 Hari"], ["30d", "30 Hari"], ["all", "Semua"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  period === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={exportPDF}>
            <FileDown className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-6">
        {[
          { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, color: "text-primary" },
          { label: "Total Pesanan", value: stats.totalOrders, icon: ShoppingBag, color: "text-blue-400" },
          { label: "Rata-rata Order", value: formatPrice(stats.avgOrderValue), icon: TrendingUp, color: "text-purple-400" },
          { label: "Menunggu", value: stats.pendingCount, icon: Clock, color: "text-yellow-400" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl bg-card p-4 shadow-card">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 font-display text-lg font-bold text-foreground tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl bg-card p-4 shadow-card mb-4">
        <p className="text-sm font-semibold text-foreground mb-3">Tren Revenue</p>
        {revenueByDay.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 20%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => [formatPrice(value), "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(140, 70%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data.</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Trend */}
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground mb-3">Tren Jumlah Pesanan</p>
          {revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 20%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(value: number) => [value, "Pesanan"]} />
                <Line type="monotone" dataKey="orders" stroke="hsl(200, 70%, 50%)" strokeWidth={2} dot={{ fill: "hsl(200, 70%, 50%)", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data.</p>
          )}
        </div>

        {/* Status Pie */}
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground mb-3">Status Pesanan</p>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {ordersByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data.</p>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
        <p className="text-sm font-semibold text-foreground mb-3">Produk Terlaris</p>
        {topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 20%)" />
              <XAxis type="number" tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: "hsl(220, 10%, 60%)", fontSize: 11 }} width={100} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => [formatPrice(value), "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(280, 60%, 55%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data.</p>
        )}
      </div>
    </div>
  );
}
