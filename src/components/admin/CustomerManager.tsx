import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { Search, ChevronDown, ChevronUp, Mail, Phone, ShoppingBag, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Customer {
  user_id: string;
  customer_name: string;
  customer_phone: string;
  email?: string;
  total_orders: number;
  total_spent: number;
  last_order: string;
}

interface CustomerOrder {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  order_method: string;
  order_items: { product_name: string; quantity: number; price_at_purchase: number }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  ready_for_pickup: "bg-primary/20 text-primary",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
};

export default function CustomerManager({ orders }: { orders: any[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; phone: string | null }>>({});

  // Aggregate customers from orders
  const customers: Customer[] = (() => {
    const map = new Map<string, Customer>();
    orders.forEach((o) => {
      const key = o.user_id || o.customer_phone;
      const existing = map.get(key);
      if (existing) {
        existing.total_orders++;
        if (o.status !== "cancelled") existing.total_spent += o.total_price;
        if (new Date(o.created_at) > new Date(existing.last_order)) {
          existing.last_order = o.created_at;
          existing.customer_name = o.customer_name;
        }
      } else {
        map.set(key, {
          user_id: key,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          total_orders: 1,
          total_spent: o.status !== "cancelled" ? o.total_price : 0,
          last_order: o.created_at,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent);
  })();

  const filtered = customers.filter((c) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    c.customer_phone.includes(search)
  );

  const getCustomerOrders = (customerId: string): CustomerOrder[] =>
    orders
      .filter((o) => (o.user_id || o.customer_phone) === customerId)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const exportCSV = () => {
    const rows = [["Nama", "Telepon", "Total Pesanan", "Total Belanja", "Pesanan Terakhir"]];
    filtered.forEach((c) => {
      rows.push([
        c.customer_name,
        c.customer_phone,
        String(c.total_orders),
        String(c.total_spent),
        new Date(c.last_order).toLocaleDateString("id-ID"),
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pelanggan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} pelanggan diekspor ke CSV.`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Kelola Pelanggan</h3>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{customers.length} pelanggan</p>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((c) => {
          const isExpanded = expandedId === c.user_id;
          const customerOrders = isExpanded ? getCustomerOrders(c.user_id) : [];

          return (
            <div key={c.user_id} className="rounded-xl bg-card shadow-card overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : c.user_id)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {c.customer_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{c.customer_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.customer_phone}</span>
                    <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{c.total_orders} pesanan</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(c.total_spent)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Terakhir: {new Date(c.last_order).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Riwayat Pesanan</p>
                  {customerOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tidak ada pesanan.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map((o) => (
                        <div key={o.id} className="rounded-lg bg-secondary/50 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${statusColors[o.status] || ""}`}>
                                {o.status.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(o.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-foreground tabular-nums">{formatPrice(o.total_price)}</p>
                          </div>
                          <div className="space-y-0.5">
                            {(o.order_items || []).map((item, idx) => (
                              <p key={idx} className="text-[11px] text-muted-foreground">
                                {item.quantity}x {item.product_name}
                                <span className="ml-1 text-foreground/60">@ {formatPrice(item.price_at_purchase)}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Pelanggan tidak ditemukan." : "Belum ada data pelanggan."}
          </p>
        )}
      </div>
    </div>
  );
}
