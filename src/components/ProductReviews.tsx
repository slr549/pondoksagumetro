import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profile?: { full_name: string | null } | null;
}

export default function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const loadReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*, profile:profiles(full_name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setReviews((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Login terlebih dahulu untuk memberi ulasan.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("Anda sudah memberikan ulasan untuk produk ini.");
      } else {
        toast.error("Gagal mengirim ulasan.");
      }
    } else {
      toast.success("Ulasan berhasil dikirim!");
      setComment("");
      setRating(5);
      loadReviews();
    }
    setSubmitting(false);
  };

  const userReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus ulasan.");
    } else {
      toast.success("Ulasan dihapus.");
      loadReviews();
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-lg font-display font-bold text-foreground">Ulasan Pelanggan</h2>

      {/* Submit form */}
      {user && !userReview && (
        <div className="mt-4 rounded-xl bg-card p-4 shadow-card">
          <p className="text-sm font-medium text-foreground mb-2">Tulis Ulasan</p>
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 ${
                    s <= (hoverRating || rating)
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Bagikan pengalaman Anda... (opsional)"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <Button onClick={handleSubmit} disabled={submitting} size="sm" className="mt-2">
            <Send className="h-3.5 w-3.5 mr-1" />
            {submitting ? "Mengirim..." : "Kirim Ulasan"}
          </Button>
        </div>
      )}

      {!user && (
        <p className="mt-3 text-sm text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">Login</a> untuk memberikan ulasan.
        </p>
      )}

      {/* Reviews list */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Memuat ulasan...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada ulasan untuk produk ini.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="rounded-lg bg-card p-3 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {r.profile?.full_name || "Anonim"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("id-ID")}
                  </span>
                  {user && r.user_id === user.id && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
              {r.comment && (
                <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
