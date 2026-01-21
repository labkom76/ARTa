-- 1. Tambah kolom status_pajak ke database_tagihan
ALTER TABLE public.database_tagihan 
ADD COLUMN IF NOT EXISTS status_pajak TEXT DEFAULT 'Belum Input';

-- 2. Buat tabel database_pajak
CREATE TABLE IF NOT EXISTS public.database_pajak (
    id_pajak UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tagihan UUID REFERENCES public.database_tagihan(id_tagihan) ON DELETE CASCADE,
    jenis_pajak TEXT NOT NULL,
    kode_akun TEXT NOT NULL,
    jumlah_pajak NUMERIC(20, 2) NOT NULL DEFAULT 0,
    ntpn TEXT,
    ntb TEXT,
    kode_billing TEXT,
    waktu_input TIMESTAMPTZ DEFAULT NOW(),
    id_staf_pajak UUID REFERENCES auth.users(id)
);

-- 3. Aktifkan RLS pada tabel baru
ALTER TABLE public.database_pajak ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan RLS (Contoh dasar, sesuaikan dengan kebijakan sistem Anda)
CREATE POLICY "Enable read access for authenticated users" ON public.database_pajak
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.database_pajak
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.database_pajak
    FOR UPDATE TO authenticated USING (true);

-- 5. Tambah index untuk performa
CREATE INDEX IF NOT EXISTS idx_pajak_id_tagihan ON public.database_pajak(id_tagihan);
CREATE INDEX IF NOT EXISTS idx_pajak_staf ON public.database_pajak(id_staf_pajak);
