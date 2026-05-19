-- Rollback: drop coach_gallery bucket and policies
DROP POLICY IF EXISTS "Coach gallery images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload coach gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own coach gallery images" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'coach_gallery';
