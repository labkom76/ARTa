-- Menambahkan kolom baru untuk fitur Register SP2D
ALTER TABLE database_tagihan 
ADD COLUMN IF NOT EXISTS tanggal_sp2d DATE,
ADD COLUMN IF NOT EXISTS nama_bank TEXT,
ADD COLUMN IF NOT EXISTS tanggal_bsg DATE,
ADD COLUMN IF NOT EXISTS catatan_sp2d TEXT;

-- Memberikan komentar pada kolom untuk dokumentasi
COMMENT ON COLUMN database_tagihan.tanggal_sp2d IS 'Tanggal penerbitan SP2D';
COMMENT ON COLUMN database_tagihan.nama_bank IS 'Nama Bank penyalur';
COMMENT ON COLUMN database_tagihan.tanggal_bsg IS 'Tanggal berkas diserahkan ke BSG';
COMMENT ON COLUMN database_tagihan.catatan_sp2d IS 'Catatan khusus dari petugas Register SP2D';
