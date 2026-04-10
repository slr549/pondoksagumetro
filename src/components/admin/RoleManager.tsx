import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Search, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserWithRole {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
}

const AVAILABLE_ROLES = ["admin", "moderator", "user"] as const;

export default function RoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];

    const merged: UserWithRole[] = profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      created_at: p.created_at,
      roles: roles.filter((r) => r.user_id === p.id).map((r) => r.role),
    }));

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
      u.phone?.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  const roleColors: Record<string, string> = {
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
          <UserCog className="h-5 w-5" /> Kelola Role Pengguna
        </h3>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama, telepon, atau ID..."
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
                <p className="text-sm font-medium text-foreground truncate">
                  {u.full_name || "Tanpa Nama"}
                </p>
                <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                <p className="text-[10px] text-muted-foreground/60 font-mono truncate">{u.id}</p>
              </div>
              <div className="flex flex-wrap gap-1">
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
    </div>
  );
}
