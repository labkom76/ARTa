export interface VerificationItem {
    item: string;
    memenuhi_syarat: boolean;
    keterangan: string;
}

export interface Tagihan {
    id_tagihan: string;
    nama_skpd: string;
    nomor_spm: string;
    jenis_spm: string;
    jenis_tagihan: string;
    uraian: string;
    jumlah_kotor: number;
    status_tagihan: string;
    waktu_input: string;
    id_pengguna_input: string;
    catatan_verifikator?: string;
    nomor_registrasi?: string;
    waktu_registrasi?: string;
    nama_registrator?: string;
    waktu_verifikasi?: string;
    detail_verifikasi?: VerificationItem[];
    nomor_verifikasi?: string;
    nama_verifikator?: string;
    nomor_koreksi?: string;
    id_korektor?: string;
    waktu_koreksi?: string;
    catatan_koreksi?: string;
    sumber_dana?: string;
    tanggal_spm?: string;
    // SP2D Fields
    tanggal_sp2d?: string;
    nama_bank?: string;
    tanggal_bsg?: string;
    catatan_sp2d?: string;
    nomor_urut_sp2d?: number;
    waktu_registrasi_sp2d?: string;
}
