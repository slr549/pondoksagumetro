import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/data/products";
import {
  LayoutDashboard, Package, ShoppingBag, Tag, Users, BarChart3,
  Plus, Pencil, Trash2, ChevronDown, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProductFormDialog from "@/components/admin/ProductFormDialog";
import CategoryManager from "@/components/admin/CategoryManager";

type AdminTab = "overview" | "products" | "orders" | "categories" | "customers" | "reports";

export default function AdminDashboard() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalProducts: 0, totalCustomers: 0 });
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [adminVerified, setAdminVerified] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/");
      toast.error("Akses ditolak.");
      return;
    }
    // Server-side admin verification
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate("/");
          toast.error("Akses ditolak. Anda bukan admin.");
        } else {
          setAdminVerified(true);
        }
      });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!adminVerified) return;
    loadData();
  }, [adminVerified]);

  const loadData = async () => {
    const [prodRes, ordRes, catRes] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts(prodRes.data || []);
    setOrders(ordRes.data || []);
    setCategories(catRes.data || []);

    const allOrders = ordRes.data || [];
    setStats({
      totalOrders: allOrders.length,
      totalRevenue: allOrders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + o.total_price, 0),
      totalProducts: (prodRes.data || []).length,
      totalCustomers: new Set(allOrders.map((o: any) => o.user_id).filter(Boolean)).size,
    });
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", orderId);
    if (error) { toast.error("Gagal update status."); return; }
    toast.success("Status pesanan diperbarui.");
    loadData();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Gagal menghapus produk."); return; }
    toast.success("Produk dihapus.");
    loadData();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center pt-16"><p className="text-muted-foreground">Loading...</p></div>;
  if (!adminVerified) return null;

  const tabs: { key: AdminTab; icon: any; label: string }[] = [
    { key: "overview", icon: LayoutDashboard, label: "Overview" },
    { key: "products", icon: Package, label: "Produk" },
    { key: "orders", icon: ShoppingBag, label: "Pesanan" },
    { key: "categories", icon: Tag, label: "Kategori" },
    { key: "reports", icon: BarChart3, label: "Laporan" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    confirmed: "bg-blue-500/20 text-blue-400",
    ready_for_pickup: "bg-primary/20 text-primary",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-section font-display font-bold text-foreground">Admin Panel</h1>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-20 space-y-1">
              {tabs.map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="flex gap-2 overflow-x-auto md:hidden -mx-4 px-4 pb-2 mb-4">
            {tabs.map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${tab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Overview */}
            {tab === "overview" && (
              <div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    { label: "Total Pesanan", value: stats.totalOrders, icon: ShoppingBag },
                    { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: BarChart3 },
                    { label: "Total Produk", value: stats.totalProducts, icon: Package },
                    { label: "Total Pelanggan", value: stats.totalCustomers, icon: Users },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl bg-card p-4 shadow-card">
                      <s.icon className="h-5 w-5 text-primary" />
                      <p className="mt-2 font-display text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <h3 className="font-display text-sm font-semibold text-foreground">Pesanan Terbaru</h3>
                  <div className="mt-3 space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg bg-card p-3 shadow-card">
                        <div>
                          <p className="text-sm font-medium text-foreground">{o.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("id-ID")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(o.total_price)}</p>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[o.status] || ""}`}>{o.status.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    ))}
                    {orders.length === 0 && <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Products */}
            {tab === "products" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display font-semibold text-foreground">Kelola Produk</h3>
                  <Button size="sm" onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Tambah Produk
                  </Button>
                </div>
                <div className="space-y-2">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-card">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.categories?.name} · Stok: {p.stock_quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-foreground tabular-nums">{formatPrice(p.price)}</p>
                      <button onClick={() => { setEditingProduct(p); setProductDialogOpen(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {products.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Belum ada produk di database.</p>}
                </div>
                <ProductFormDialog
                  open={productDialogOpen}
                  onOpenChange={setProductDialogOpen}
                  product={editingProduct}
                  categories={categories}
                  onSaved={loadData}
                />
              </div>
            )}

            {/* Orders */}
            {tab === "orders" && (
              <div>
                <h3 className="font-display font-semibold text-foreground mb-4">Kelola Pesanan</h3>
                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="rounded-xl bg-card p-4 shadow-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{o.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{o.customer_phone} · {new Date(o.created_at).toLocaleDateString("id-ID")}</p>
                        </div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[o.status] || ""}`}>{o.status.replace(/_/g, " ")}</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {o.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>{item.product_name} x{item.quantity}</span>
                            <span className="tabular-nums">{formatPrice(item.price_at_purchase * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                        <span className="font-display text-sm font-bold text-foreground tabular-nums">{formatPrice(o.total_price)}</span>
                        <select value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground">
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="ready_for_pickup">Ready</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Belum ada pesanan.</p>}
                </div>
              </div>
            )}

            {/* Categories */}
            {tab === "categories" && (
              <CategoryManager categories={categories} onChanged={loadData} />
            )}

            {/* Reports */}
            {tab === "reports" && (
              <div>
                <h3 className="font-display font-semibold text-foreground mb-4">Laporan Penjualan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-card p-4 shadow-card">
                    <p className="text-xs text-muted-foreground">Revenue Bulan Ini</p>
                    <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">{formatPrice(stats.totalRevenue)}</p>
                  </div>
                  <div className="rounded-xl bg-card p-4 shadow-card">
                    <p className="text-xs text-muted-foreground">Pesanan Bulan Ini</p>
                    <p className="mt-1 font-display text-xl font-bold text-foreground tabular-nums">{stats.totalOrders}</p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl bg-card p-4 shadow-card">
                  <p className="text-xs text-muted-foreground mb-3">Best Sellers</p>
                  {products.filter(p => p.is_best_seller).map(p => (
                    <div key={p.id} className="flex justify-between py-1 text-sm">
                      <span className="text-foreground">{p.name}</span>
                      <span className="tabular-nums text-muted-foreground">{formatPrice(p.price)}</span>
                    </div>
                  ))}
                  {products.filter(p => p.is_best_seller).length === 0 && <p className="text-sm text-muted-foreground">Belum ada best seller.</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
