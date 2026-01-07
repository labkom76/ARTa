-- Script untuk membuat tabel master_sumber_dana
-- Jalankan di SQL Editor Supabase

CREATE TABLE IF NOT EXISTS master_sumber_dana (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_sumber_dana TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrasi data awal dari opsi hardcoded yang ada
INSERT INTO master_sumber_dana (nama_sumber_dana)
VALUES 
    ('Pendapatan Asli Daerah'),
    ('Dana Bagi Hasil'),
    ('DAU - BG'),
    ('DAU - SG'),
    ('DAK - Fisik'),
    ('DAK - Non Fisik'),
    ('Dana Desa'),
    ('Insentif Fiskal'),
    ('Pendapatan Transfer Antar Daerah')
ON CONFLICT (nama_sumber_dana) DO NOTHING;

-- Hak akses (RLS) - Sesuaikan dengan kebijakan keamanan Anda
ALTER TABLE master_sumber_dana ENABLE ROW LEVEL SECURITY;

-- Izinkan semua pengguna (terautentikasi) untuk membaca
CREATE POLICY "Izinkan baca untuk semua user terautentikasi" 
ON master_sumber_dana FOR SELECT 
TO authenticated 
USING (true);

-- Hanya Administrator yang boleh menambah/mengubah/menghapus (Contoh)
-- Catatan: Kebijakan ini bergantung pada bagaimana role disimpan di tabel profiles
-- Jika profil menggunakan peran 'Administrator', sesuaikan query di bawah:
/*
CREATE POLICY "Hanya Admin yang boleh mengelola" 
ON master_sumber_dana FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.peran = 'Administrator'
  )
);
*/

-- Untuk kemudahan awal, kita izinkan semua user terautentikasi untuk mengelola 
-- (Sangat disarankan untuk memperketat ini nantinya)
CREATE POLICY "Izinkan kelola untuk user terautentikasi" 
ON master_sumber_dana FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
