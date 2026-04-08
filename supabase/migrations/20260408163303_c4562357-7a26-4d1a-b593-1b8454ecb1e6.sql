
INSERT INTO storage.buckets (id, name, public) VALUES ('notification-sounds', 'notification-sounds', true);

CREATE POLICY "Anyone can view notification sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-sounds');

CREATE POLICY "Admins can upload notification sounds"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'notification-sounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notification sounds"
ON storage.objects FOR UPDATE
USING (bucket_id = 'notification-sounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notification sounds"
ON storage.objects FOR DELETE
USING (bucket_id = 'notification-sounds' AND public.has_role(auth.uid(), 'admin'));
