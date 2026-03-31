import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Filter, Clock, Phone, User, MapPin, ChevronDown, ChevronUp, Trash2, Download, CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrderManagerProps {
  orders: any[];
  onChanged: () => void;
}

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  ready_for_pickup: "Siap Diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  ready_for_pickup: "bg-primary/20 text-primary",
  completed: "bg-green-500/20 text-green-400",
  cancelled: "bg-destructive/20 text-destructive",
};

const methodLabels: Record<string, string> = {
  online_payment: "Online Payment",
  whatsapp: "WhatsApp",
};

export default function OrderManager({ orders, onChanged }: OrderManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_phone.includes(search) ||
        o.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const updateStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: status as any })
      .eq("id", orderId);
    if (error) {
      toast.error("Gagal update status.");
      return;
    }
    toast.success("Status pesanan diperbarui.");
    onChanged();
  };

  const deleteOrder = async (orderId: string) => {
    // Delete order items first, then the order
    await supabase.from("order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast.error("Gagal menghapus pesanan.");
      return;
    }
    toast.success("Pesanan dihapus.");
    onChanged();
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const exportCSV = () => {
    const rows = [["ID", "Tanggal", "Nama", "Telepon", "Metode", "Pickup", "Status", "Item", "Total"]];
    filtered.forEach((o) => {
      const items = (o.order_items || []).map((i: any) => `${i.product_name} x${i.quantity}`).join("; ");
      rows.push([
        o.id,
        new Date(o.created_at).toLocaleString("id-ID"),
        o.customer_name,
        o.customer_phone,
        o.order_method,
        o.pickup_time || "-",
        o.status,
        items,
        o.total_price,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pesanan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} pesanan diekspor ke CSV.`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Kelola Pesanan</h3>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* Status summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: "all", label: "Semua" },
          { key: "pending", label: "Menunggu" },
          { key: "confirmed", label: "Dikonfirmasi" },
          { key: "ready_for_pickup", label: "Siap Diambil" },
          { key: "completed", label: "Selesai" },
          { key: "cancelled", label: "Dibatalkan" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} ({statusCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, telepon, atau ID pesanan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.map((o) => {
          const isExpanded = expandedOrder === o.id;
          return (
            <div key={o.id} className="rounded-xl bg-card shadow-card overflow-hidden">
              {/* Header - clickable */}
              <button
                onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{o.customer_name}</p>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[o.status] || ""}`}>
                        {statusLabels[o.status] || o.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      <span>·</span>
                      <span className="tabular-nums">{formatPrice(o.total_price)}</span>
                      <span>·</span>
                      <span>{o.order_items?.length || 0} item</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  {/* Customer info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{o.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{methodLabels[o.order_method] || o.order_method}</span>
                    </div>
                    {o.pickup_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Pickup: {o.pickup_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Order items */}
                  <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
                    {o.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-foreground">
                          {item.product_name} <span className="text-muted-foreground">x{item.quantity}</span>
                        </span>
                        <span className="tabular-nums text-foreground">{formatPrice(item.price_at_purchase * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border">
                      <span className="text-foreground">Total</span>
                      <span className="tabular-nums text-foreground">{formatPrice(o.total_price)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-3 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Select value={o.status} onValueChange={(val) => updateStatus(o.id, val)}>
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Menunggu</SelectItem>
                          <SelectItem value="confirmed">Dikonfirmasi</SelectItem>
                          <SelectItem value="ready_for_pickup">Siap Diambil</SelectItem>
                          <SelectItem value="completed">Selesai</SelectItem>
                          <SelectItem value="cancelled">Dibatalkan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pesanan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Pesanan dari {o.customer_name} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteOrder(o.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Order ID */}
                  <p className="mt-2 text-[10px] text-muted-foreground font-mono">ID: {o.id}</p>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {orders.length === 0 ? "Belum ada pesanan." : "Tidak ada pesanan yang cocok."}
          </p>
        )}
      </div>
    </div>
  );
}
