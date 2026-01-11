-- =========================================================
-- SCRIPT PENAMBAHAN KOLOM NOMOR SP2D (PERMANEN)
-- Jalankan skrip ini di SQL Editor Supabase Abang
-- =========================================================

-- 1. Tambahkan kolom nomor_sp2d ke tabel database_tagihan
-- Kolom ini akan menyimpan format lengkap seperti:
-- "75.01/04.0/000001/LS/5.02.0.00.0.00.02.0000/M/01/2026"
ALTER TABLE public.database_tagihan 
ADD COLUMN IF NOT EXISTS nomor_sp2d text;

-- 2. (Opsional) Berikan izin/comment untuk dokumentasi
COMMENT ON COLUMN public.database_tagihan.nomor_sp2d IS 'Berisi format nomor SP2D yang sudah ditransformasi saat registrasi (Snapshot)';

-- 3. Verifikasi kolom sudah masuk
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'database_tagihan' AND column_name = 'nomor_sp2d';
