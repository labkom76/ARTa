-- =========================================================
-- SCRIPT PERBAIKAN RLS UNTUK TABEL DATABASE_PAJAK
-- Jalankan skrip ini di SQL Editor Supabase Abang
-- =========================================================

-- 1. Hapus kebijakan lama yang mungkin kurang lengkap (Opsional, tapi disarankan)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.database_pajak;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.database_pajak;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.database_pajak;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.database_pajak;

-- 2. Kebijakan SELECT
CREATE POLICY "Staf Pajak can view pajak" 
ON public.database_pajak FOR SELECT 
TO authenticated 
USING (true);

-- 3. Kebijakan INSERT
CREATE POLICY "Staf Pajak can insert pajak" 
ON public.database_pajak FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.peran = 'Staf Pajak' OR profiles.peran = 'Administrator')
  )
);

-- 4. Kebijakan UPDATE
CREATE POLICY "Staf Pajak can update pajak" 
ON public.database_pajak FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.peran = 'Staf Pajak' OR profiles.peran = 'Administrator')
  )
);

-- 5. Kebijakan DELETE (INI YANG KURANG KEMARIN!)
CREATE POLICY "Staf Pajak can delete pajak" 
ON public.database_pajak FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.peran = 'Staf Pajak' OR profiles.peran = 'Administrator')
  )
);

-- Pastikan RLS aktif
ALTER TABLE public.database_pajak ENABLE ROW LEVEL SECURITY;
