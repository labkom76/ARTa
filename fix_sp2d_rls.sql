-- =========================================================
-- SCRIPT PERBAIKAN RLS (ROW LEVEL SECURITY) UNTUK PORTAL SP2D
-- Jalankan skrip ini di SQL Editor Supabase Abang
-- =========================================================

-- 1. Cek dulu apakah datanya memang ada (opsional)
-- SELECT status_tagihan, count(*) FROM database_tagihan GROUP BY status_tagihan;

-- 2. Aktifkan kebijakan SELECT untuk peran 'Register SP2D'
-- Kebijakan ini mengizinkan petugas SP2D melihat tagihan yang statusnya 'Diteruskan' (antrian) 
-- dan 'Selesai' (riwayat)
CREATE POLICY "Register SP2D can view relevant bills" 
ON database_tagihan
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.peran = 'Register SP2D' OR profiles.peran = 'Administrator')
  )
  AND (status_tagihan = 'Diteruskan' OR status_tagihan = 'Selesai')
);

-- 3. Aktifkan kebijakan UPDATE untuk peran 'Register SP2D'
-- Kebijakan ini mengizinkan petugas SP2D untuk mengisi data SP2D pada tagihan yang sedang antri
CREATE POLICY "Register SP2D can update bills to complete" 
ON database_tagihan
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.peran = 'Register SP2D' OR profiles.peran = 'Administrator')
  )
  AND status_tagihan = 'Diteruskan'
)
WITH CHECK (
  status_tagihan = 'Selesai'
);

-- 4. Berikan izin SELECT pada tabel master_skpd agar dropdown filter SKPD muncul
CREATE POLICY "Register SP2D can view master_skpd" 
ON master_skpd
FOR SELECT 
TO authenticated
USING (true);
