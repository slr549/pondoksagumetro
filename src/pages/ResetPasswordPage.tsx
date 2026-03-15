import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery event from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check if the hash contains type=recovery (user may have landed directly)
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password tidak cocok.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      console.error("Update password error:", error.message);
      toast.error("Gagal memperbarui password. Silakan coba lagi.");
      return;
    }
    setDone(true);
    toast.success("Password berhasil diperbarui!");
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <h1 className="text-section font-display font-bold text-foreground">Password Diperbarui</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Password Anda berhasil diperbarui. Silakan masuk dengan password baru.
          </p>
          <Button className="mt-6" onClick={() => navigate("/")}>
            Ke Halaman Utama
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 pt-16">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-section font-display font-bold text-foreground">Reset Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Link reset tidak valid atau sudah kedaluwarsa. Silakan minta link baru.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/forgot-password")}>
            Minta Link Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-16">
      <div className="w-full max-w-sm">
        <h1 className="text-section font-display font-bold text-foreground text-center">Reset Password</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">Masukkan password baru Anda.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Password Baru</label>
            <div className="relative mt-1">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Konfirmasi Password</label>
            <Input
              type={showPw ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Memproses..." : "Perbarui Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
