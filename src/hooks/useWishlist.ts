import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ["wishlist-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((w) => w.product_id);
    },
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isWished = wishlistIds.includes(productId);
      if (isWished) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-ids", user?.id] });
    },
  });

  return { wishlistIds, toggleWishlist: toggle.mutate, isToggling: toggle.isPending };
}
