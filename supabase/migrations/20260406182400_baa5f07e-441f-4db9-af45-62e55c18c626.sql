-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can upload pill images" ON storage.objects;

-- Authenticated users can upload to their own folder only
CREATE POLICY "Authenticated users upload to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pill-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

-- Anonymous users can upload to the 'anon' folder only
CREATE POLICY "Anonymous users upload to anon folder"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'pill-images'
  AND (storage.foldername(name))[1] = 'anon'
  AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp'))
);

-- Allow anyone to view images in the 'anon' folder (for shared anonymous reports)
CREATE POLICY "Anyone can view anon pill images"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'pill-images'
  AND (storage.foldername(name))[1] = 'anon'
);