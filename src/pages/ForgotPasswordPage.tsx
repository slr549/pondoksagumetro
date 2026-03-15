import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Masukkan alamat email Anda.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      console.error("Reset password error:", error.message);
    }
    // Always show success to prevent user enumeration
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-16">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Kembali ke login
        </Link>

        {!sent ? (
          <>
            <h1 className="text-section font-display font-bold text-foreground">Lupa Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Mengirim..." : "Kirim Link Reset"}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-section font-display font-bold text-foreground">Cek Email Anda</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Jika akun dengan email tersebut ada, kami telah mengirimkan link untuk reset password. Silakan periksa inbox Anda.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
              Kirim Ulang
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
