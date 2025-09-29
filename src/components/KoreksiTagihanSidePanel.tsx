import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckIcon, XIcon } from 'lucide-react';

interface KoreksiTagihanSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  tagihanId: string | null;
}

const KoreksiTagihanSidePanel: React.FC<KoreksiTagihanSidePanelProps> = ({ isOpen, onClose, tagihanId }) => {
  if (!isOpen || !tagihanId) {
    return null;
  }

  // Placeholder data for static display
  const placeholderTagihan = {
    nomor_spm: 'SPM-20240101-001',
    nama_skpd: 'Dinas Pendidikan',
    jenis_spm: 'Belanja Pegawai',
    jenis_tagihan: 'Uang Persediaan (UP)',
    uraian: 'Pembayaran gaji dan tunjangan bulan Januari 2024',
    jumlah_kotor: 150000000,
    status_tagihan: 'Dikembalikan',
    nomor_registrasi: 'REG-20240102-0001',
    waktu_registrasi: '2024-01-02T10:00:00Z',
    nama_registrator: 'Budi Santoso',
    nomor_verifikasi: 'VER-20240103-0001',
    waktu_verifikasi: '2024-01-03T14:30:00Z',
    nama_verifikator: 'Siti Aminah',
    catatan_verifikator: 'Dokumen pendukung kurang lengkap, harap perbaiki.',
    detail_verifikasi: [
      { item: 'SPTJ', memenuhi_syarat: true, keterangan: '' },
      { item: 'Kebenaran Perhitungan Tagihan', memenuhi_syarat: true, keterangan: '' },
      { item: 'Kesesuaian Kode Rekening', memenuhi_syarat: false, keterangan: 'Kode rekening tidak sesuai dengan anggaran.' },
      { item: 'E-Billing', memenuhi_syarat: true, keterangan: '' },
      { item: 'Fotocopy Rekening Pihak Ketiga / Bendahara Pengeluaran / Bendahara Pengeluaran Pembantu', memenuhi_syarat: false, keterangan: 'Fotocopy rekening tidak jelas.' },
      { item: 'Fotocopy NPWP', memenuhi_syarat: true, keterangan: '' },
      { item: 'Tanda Penerimaan / Kwitansi / Bukti Pembayaran', memenuhi_syarat: true, keterangan: '' },
      { item: 'Lainnya', memenuhi_syarat: true, keterangan: '' },
    ],
  };

  const checklistItems = [
    'SPTJ',
    'Kebenaran Perhitungan Tagihan',
    'Kesesuaian Kode Rekening',
    'E-Billing',
    'Fotocopy Rekening Pihak Ketiga / Bendahara Pengeluaran / Bendahara Pengeluaran Pembantu',
    'Fotocopy NPWP',
    'Tanda Penerimaan / Kwitansi / Bukti Pembayaran',
    'Lainnya',
  ];

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="bg-white dark:bg-gray-800 w-full md:w-1/3 lg:w-1/4 h-full shadow-lg overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Koreksi Tagihan</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            &times;
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Area 1: Detail Tagihan */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Detail Tagihan</h3>
            <div className="grid grid-cols-1 gap-y-2 text-sm">
              <div>
                <Label className="text-muted-foreground">Nomor SPM</Label>
                <p className="font-medium">{placeholderTagihan.nomor_spm}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Nama SKPD</Label>
                <p className="font-medium">{placeholderTagihan.nama_skpd}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jenis SPM</Label>
                <p className="font-medium">{placeholderTagihan.jenis_spm}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jenis Tagihan</Label>
                <p className="font-medium">{placeholderTagihan.jenis_tagihan}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Uraian</Label>
                <p className="font-medium">{placeholderTagihan.uraian}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jumlah Kotor</Label>
                <p className="font-medium">Rp{placeholderTagihan.jumlah_kotor.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status Tagihan</Label>
                <p className="font-medium">{placeholderTagihan.status_tagihan}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Waktu Registrasi</Label>
                <p className="font-medium">{formatDate(placeholderTagihan.waktu_registrasi)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Nomor Registrasi</Label>
                <p className="font-medium">{placeholderTagihan.nomor_registrasi}</p>
              </div>
            </div>
          </div>

          {/* Area 2: Hasil Verifikasi Sebelumnya */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Hasil Verifikasi Sebelumnya</h3>
            <div className="text-sm mb-2">
              <Label className="text-muted-foreground">Catatan Verifikator:</Label>
              <p className="font-medium">{placeholderTagihan.catatan_verifikator}</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uraian</TableHead>
                  <TableHead className="w-[100px] text-center">Memenuhi Syarat</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklistItems.map((item, index) => {
                  const verificationDetail = placeholderTagihan.detail_verifikasi?.find(
                    (detail) => detail.item === item
                  );
                  const isMet = verificationDetail?.memenuhi_syarat;
                  const keterangan = verificationDetail?.keterangan || '-';
                  return (
                    <TableRow key={index}>
                      <TableCell>{item}</TableCell>
                      <TableCell className="text-center">
                        {isMet ? (
                          <CheckIcon className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <XIcon className="h-4 w-4 text-red-600 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>{keterangan}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Area 3: Input Koreksi */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Input Koreksi</h3>
            <div className="mb-4">
              <Label className="text-muted-foreground">Penyebab:</Label>
              <p className="font-medium text-red-600">"Tidak dapat diterbitkan SP2D"</p>
            </div>
            <div className="grid gap-2 mb-4">
              <Label htmlFor="keterangan-koreksi">Keterangan</Label>
              <Textarea id="keterangan-koreksi" placeholder="Masukkan keterangan koreksi..." rows={4} />
            </div>
            <Button className="w-full">Konfirmasi Pengembalian</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KoreksiTagihanSidePanel;