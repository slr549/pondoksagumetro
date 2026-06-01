import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Search, UserCog, CheckCircle2, XCircle, Mail, Eye, Phone, Calendar, Clock, Package, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatPrice } from "@/data/products";

interface UserWithRole {
  id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
}

const AVAILABLE_ROLES = ["developer", "admin", "moderator", "user"] as const;

interface LastOrder {
  id: string;
  created_at: string;
  status: string;
  total_price: number;
  payment_status: string | null;
  order_method: string;
  items: { product_name: string; quantity: number; price_at_purchase: number }[];
}

export default function RoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [detailUser, setDetailUser] = useState<UserWithRole | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const openDetail = async (u: UserWithRole) => {
    setDetailUser(u);
    setLastOrder(null);
    setLoadingOrder(true);
    const { data } = await supabase
      .from("orders")
      .select("id, created_at, status, total_price, payment_status, order_method, order_items(product_name, quantity, price_at_purchase)")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLastOrder({
        id: data.id,
        created_at: data.created_at,
        status: data.status,
        total_price: data.total_price,
        payment_status: data.payment_status,
        order_method: data.order_method,
        items: (data.order_items as any[]) || [],
      });
    }
    setLoadingOrder(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    const [authRes, profilesRes, rolesRes] = await Promise.all([
      supabase.functions.invoke("list-users"),
      supabase.from("profiles").select("id, full_name, phone, created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (authRes.error) {
      toast.error("Gagal memuat daftar pengguna: " + authRes.error.message);
      setLoading(false);
      return;
    }

    const authUsers: Array<{
      id: string;
      email: string | null;
      email_confirmed_at: string | null;
      last_sign_in_at: string | null;
      created_at: string;
    }> = authRes.data?.users || [];
    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const merged: UserWithRole[] = authUsers.map((u) => {
      const p = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email,
        email_confirmed_at: u.email_confirmed_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        created_at: u.created_at,
        roles: roles.filter((r) => r.user_id === u.id).map((r) => r.role),
      };
    });

    merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const addRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: role as any,
    });
    if (error) {
      toast.error("Gagal menambah role: " + error.message);
      return;
    }
    toast.success("Role berhasil ditambahkan.");
    loadUsers();
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as any);
    if (error) {
      toast.error("Gagal menghapus role: " + error.message);
      return;
    }
    toast.success("Role berhasil dihapus.");
    loadUsers();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const roleColors: Record<string, string> = {
    developer: "bg-purple-500/20 text-purple-500",
    admin: "bg-destructive/20 text-destructive",
    moderator: "bg-primary/20 text-primary",
    user: "bg-secondary text-muted-foreground",
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Memuat data pengguna...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <UserCog className="h-5 w-5" /> Pengguna &amp; Role
        </h3>
        <span className="text-xs text-muted-foreground">{filtered.length} pengguna</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, email, telepon, atau ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.full_name || "Tanpa Nama"}
                  </p>
                  {u.email_confirmed_at ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-500">
                      <CheckCircle2 className="h-3 w-3" /> Terverifikasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-yellow-500/15 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
                      <XCircle className="h-3 w-3" /> Belum verifikasi
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" /> {u.email || "—"}
                </p>
                <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                <p className="text-[10px] text-muted-foreground/60">
                  Bergabung: {new Date(u.created_at).toLocaleDateString("id-ID")}
                  {u.last_sign_in_at && ` · Terakhir login: ${new Date(u.last_sign_in_at).toLocaleDateString("id-ID")}`}
                </p>
                <p className="text-[10px] text-muted-foreground/60 font-mono truncate">{u.id}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {u.roles.length === 0 && (
                  <span className="text-[10px] text-muted-foreground italic">Tanpa role</span>
                )}
                {u.roles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${roleColors[role] || ""}`}
                  >
                    <Shield className="h-3 w-3" />
                    {role}
                    <button
                      onClick={() => removeRole(u.id, role)}
                      className="ml-0.5 hover:opacity-70 font-bold"
                      title="Hapus role"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={() => openDetail(u)}
              >
                <Eye className="h-3 w-3" /> Detail
              </Button>
              {AVAILABLE_ROLES.filter((r) => !u.roles.includes(r)).map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addRole(u.id, role)}
                >
                  + {role}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "Tidak ada pengguna yang cocok." : "Belum ada pengguna terdaftar."}
          </p>
        )}
      </div>

      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  {detailUser.full_name || "Tanpa Nama"}
                </DialogTitle>
                <DialogDescription className="font-mono text-[10px] break-all">
                  {detailUser.id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Autentikasi
                  </h4>
                  <div className="space-y-1.5 rounded-lg bg-secondary/50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground break-all">{detailUser.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {detailUser.email_confirmed_at ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-green-500">
                            Terverifikasi · {new Date(detailUser.email_confirmed_at).toLocaleString("id-ID")}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          <span className="text-yellow-500">Email belum diverifikasi</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        Terakhir login:{" "}
                        <span className="text-foreground">
                          {detailUser.last_sign_in_at
                            ? new Date(detailUser.last_sign_in_at).toLocaleString("id-ID")
                            : "Belum pernah"}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        Bergabung:{" "}
                        <span className="text-foreground">
                          {new Date(detailUser.created_at).toLocaleString("id-ID")}
                        </span>
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Profil
                  </h4>
                  <div className="space-y-1.5 rounded-lg bg-secondary/50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{detailUser.full_name || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{detailUser.phone || "—"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {detailUser.roles.length === 0 ? (
                        <span className="text-[11px] italic text-muted-foreground">Tanpa role</span>
                      ) : (
                        detailUser.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${roleColors[role] || ""}`}
                          >
                            <Shield className="h-3 w-3" /> {role}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Pesanan Terakhir
                  </h4>
                  {loadingOrder ? (
                    <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                      Memuat...
                    </p>
                  ) : !lastOrder ? (
                    <p className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                      Belum ada pesanan.
                    </p>
                  ) : (
                    <div className="space-y-2 rounded-lg bg-secondary/50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(lastOrder.created_at).toLocaleString("id-ID")}
                        </span>
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {lastOrder.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {lastOrder.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-muted-foreground truncate pr-2">
                              {it.product_name} × {it.quantity}
                            </span>
                            <span className="tabular-nums text-foreground shrink-0">
                              {formatPrice(it.price_at_purchase * it.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between border-t border-border pt-1.5">
                        <span className="text-xs font-medium text-foreground">Total</span>
                        <span className="text-sm font-display font-bold text-foreground tabular-nums">
                          {formatPrice(lastOrder.total_price)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 text-[10px] text-muted-foreground">
                        <span>Metode: {lastOrder.order_method}</span>
                        {lastOrder.payment_status && <span>Pembayaran: {lastOrder.payment_status}</span>}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
