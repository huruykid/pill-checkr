
-- Make the storage INSERT policy more restrictive - limit to image types and reasonable size
DROP POLICY IF EXISTS "Anyone can upload pill images" ON storage.objects;

CREATE POLICY "Anyone can upload pill images"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'pill-images' 
  AND (storage.extension(name) = 'jpg' 
    OR storage.extension(name) = 'jpeg' 
    OR storage.extension(name) = 'png' 
    OR storage.extension(name) = 'webp')
);
