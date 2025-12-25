-- Drop the overly permissive public storage policy that allows anyone to read all files
DROP POLICY IF EXISTS "Public can view notes files" ON storage.objects;