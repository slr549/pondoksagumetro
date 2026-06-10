import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { queryClient } from "@/App";

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
  // Flag set while the user explicitly clicks "Keluar" so the auth-state
  // listener doesn't also fire its "session expired" redirect/toast.
  const manualSignOutRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

        // Sync logout with Supabase session lifecycle: if the session ends
        // unexpectedly (token expired/revoked, or refresh failed), clear
        // cached data and bounce the user to the login page.
        // Skip this branch entirely for *manual* sign-out — signOut() itself
        // handles cleanup, toast, and navigation.
        if (
          !manualSignOutRef.current &&
          (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session))
        ) {
          try {
            Object.keys(localStorage)
              .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
              .forEach((k) => localStorage.removeItem(k));
          } catch {
            /* ignore */
          }
          queryClient.clear();
          const path = window.location.pathname;
          const isPublic =
            path === "/" ||
            path.startsWith("/login") ||
            path.startsWith("/auth") ||
            path.startsWith("/reset-password") ||
            path.startsWith("/produk") ||
            path.startsWith("/kategori") ||
            path.startsWith("/tentang") ||
            path.startsWith("/kontak");
          if (!isPublic) {
            toast.info("Sesi Anda telah berakhir. Silakan masuk kembali.", {
              id: "session-expired",
            });
            navigate("/login", { replace: true });
          }
        }
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
    manualSignOutRef.current = true;
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
    queryClient.clear();
    // Dismiss any stale "session expired" toast that may have raced in.
    toast.dismiss("session-expired");
    toast.success("Berhasil keluar. Sampai jumpa!", { id: toastId });
    navigate("/", { replace: true });
    // Reset the flag on the next tick so future token expiries still redirect.
    setTimeout(() => {
      manualSignOutRef.current = false;
    }, 500);
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
