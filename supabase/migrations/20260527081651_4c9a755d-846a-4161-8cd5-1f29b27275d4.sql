
-- Drop the overly permissive public SELECT policy that exposed user_id
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;

-- Allow users to read their own review rows directly (needed for ownership checks)
CREATE POLICY "Users can view own reviews"
ON public.reviews
FOR SELECT
USING (auth.uid() = user_id);

-- Create a public-facing view that excludes user_id
CREATE OR REPLACE VIEW public.reviews_public AS
SELECT
  r.id,
  r.product_id,
  r.rating,
  r.comment,
  r.created_at,
  p.full_name AS reviewer_name,
  (auth.uid() = r.user_id) AS is_mine
FROM public.reviews r
LEFT JOIN public.profiles p ON p.id = r.user_id;

GRANT SELECT ON public.reviews_public TO anon, authenticated;
