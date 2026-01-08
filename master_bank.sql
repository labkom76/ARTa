-- Script untuk membuat tabel master_bank
-- Jalankan di SQL Editor Supabase

CREATE TABLE IF NOT EXISTS master_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_bank TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Migrasi data awal dari opsi hardcoded yang ada
INSERT INTO master_bank (nama_bank)
VALUES 
    ('SulutGo (BSG)'),
    ('BRI'),
    ('BNI'),
    ('Mandiri'),
    ('Mandiri Taspen'),
    ('Maluku Malut'),
    ('Maspion Indonesia'),
    ('Mayapada Internasional'),
    ('Maybank Indonesia'),
    ('Mayora'),
    ('Mega'),
    ('Mega Syariah'),
    ('Mestika Dharma'),
    ('Mizuho Indonesia'),
    ('MNC Internasional'),
    ('Muamalat Indonesia'),
    ('Multiarta Sentosa'),
    ('Nagari'),
    ('Nano Syariah'),
    ('Nationalnobu'),
    ('NTB Syariah'),
    ('OCBC NISP'),
    ('Oke Indonesia'),
    ('Panin'),
    ('Panin Dubai Syariah'),
    ('Papua'),
    ('Permata'),
    ('QNB Indonesia'),
    ('Raya Indonesia'),
    ('Resona Perdania'),
    ('Riau Kepri Syariah'),
    ('Sahabat Sampoerna'),
    ('SBI Indonesia'),
    ('Shinhan Indonesia'),
    ('Sinarmas'),
    ('Sulselbar'),
    ('Sulteng'),
    ('Sultra'),
    ('Sumitomo Mitsui Indonesia'),
    ('Sumsel Babel'),
    ('Sumut'),
    ('Syariah Indonesia (BSI)'),
    ('Tabungan Negara (BTN)'),
    ('UOB Indonesia'),
    ('Victoria International'),
    ('Victoria Syariah'),
    ('Woori Saudara Indonesia 1906')
ON CONFLICT (nama_bank) DO NOTHING;

-- Hak akses (RLS)
ALTER TABLE master_bank ENABLE ROW LEVEL SECURITY;

-- Izinkan semua pengguna (terautentikasi) untuk membaca
CREATE POLICY "Izinkan baca untuk semua user terautentikasi" 
ON master_bank FOR SELECT 
TO authenticated 
USING (true);

-- Izinkan kelola (tambah) untuk user terautentikasi agar bisa nambah On-The-Fly
CREATE POLICY "Izinkan kelola untuk user terautentikasi" 
ON master_bank FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
