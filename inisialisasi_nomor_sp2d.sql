-- =========================================================
-- SCRIPT INISIALISASI PENGATURAN NOMOR SP2D
-- Jalankan skrip ini di SQL Editor Supabase Abang
-- =========================================================

-- Inisialisasi Nomor SP2D (menggantikan bagian kedua nomor SPM)
INSERT INTO public.app_settings (key, value)
VALUES ('nomor_sp2d', '04.0')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Inisialisasi Kode Wilayah (optional, sesuaikan jika perlu)
INSERT INTO public.app_settings (key, value)
VALUES ('kode_wilayah', '75.01')
ON CONFLICT (key) DO NOTHING;

-- Verifikasi hasil
SELECT * FROM public.app_settings WHERE key IN ('nomor_sp2d', 'kode_wilayah');
