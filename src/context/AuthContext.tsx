import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  isModerator: boolean;
  isStaff: boolean;
  role: "developer" | "admin" | "moderator" | "user" | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);
          setRoles((data || []).map((r: any) => r.role));
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .then(({ data }) => setRoles((data || []).map((r: any) => r.role)));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const toastId = "auth-signout";
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });

      // Treat already-missing sessions as a successful logout instead of an error
      const benign =
        !error ||
        error.name === "AuthSessionMissingError" ||
        /session.*(missing|not found)/i.test(error.message ?? "");

      if (!benign) {
        console.error("signOut error:", error);
        // Don't block local cleanup — still clear client state below
      }
    } catch (err) {
      console.error("signOut threw:", err);
    }

    // Always clear local state and any stale Supabase tokens, even if the
    // server call failed silently — prevents the user being stuck "logged in".
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }

    setUser(null);
    setSession(null);
    setRoles([]);
    toast.success("Berhasil keluar. Sampai jumpa!", { id: toastId });
    navigate("/", { replace: true });
  };

  const isDeveloper = roles.includes("developer");
  const isAdmin = isDeveloper || roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isStaff = isDeveloper || isAdmin || isModerator;
  const role: AuthContextType["role"] = isDeveloper
    ? "developer"
    : roles.includes("admin")
    ? "admin"
    : isModerator
    ? "moderator"
    : user
    ? "user"
    : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isDeveloper, isModerator, isStaff, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
