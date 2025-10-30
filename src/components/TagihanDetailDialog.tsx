import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale'; // Import locale for Indonesian date formatting
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components

interface VerificationItem {
  item: string;
  memenuhi_syarat: boolean;
  keterangan: string;
}

interface Tagihan {
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
  sumber_dana?: string; // Add sumber_dana to Tagihan interface
}

interface TagihanDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tagihan: Tagihan | null;
}

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

const TagihanDetailDialog: React.FC<TagihanDetailDialogProps> = ({ isOpen, onClose, tagihan }) => {
  if (!tagihan) return null;

  const showVerifikatorSection = tagihan.status_tagihan === 'Diteruskan' || tagihan.status_tagihan === 'Dikembalikan';

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: id });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString; // Fallback to raw string if formatting fails
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Tagihan: {tagihan.nomor_spm}</DialogTitle>
          <DialogDescription>Informasi lengkap mengenai tagihan ini.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Bagian 1 - Detail Utama */}
          <h3 className="text-lg font-semibold mb-2">Detail Utama</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <Label className="text-muted-foreground">Nomor SPM</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis block font-medium">
                    {tagihan.nomor_spm}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tagihan.nomor_spm}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <Label className="text-muted-foreground">Nama SKPD</Label>
              <p className="font-medium">{tagihan.nama_skpd}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Jenis SPM</Label>
              <p className="font-medium">{tagihan.jenis_spm}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Jenis Tagihan</Label>
              <p className="font-medium">{tagihan.jenis_tagihan}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Sumber Dana</Label> {/* New field */}
              <p className="font-medium">{tagihan.sumber_dana || '-'}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">Uraian</Label>
              <p className="font-medium">{tagihan.uraian}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Jumlah Kotor</Label>
              <p className="font-medium">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status Tagihan</Label>
              <p className="font-medium">{tagihan.status_tagihan}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Waktu Input</Label>
              <p className="font-medium">{formatDate(tagihan.waktu_input)}</p>
            </div>
            {tagihan.nomor_registrasi && (
              <div>
                <Label className="text-muted-foreground">Nomor Registrasi</Label>
                <p className="font-medium">{tagihan.nomor_registrasi}</p>
              </div>
            )}
            {tagihan.nama_registrator && (
              <div>
                <Label className="text-muted-foreground">Registrator</Label>
                <p className="font-medium">{tagihan.nama_registrator}</p>
              </div>
            )}
            {tagihan.waktu_registrasi && (
              <div>
                <Label className="text-muted-foreground">Waktu Registrasi</Label>
                <p className="font-medium">{formatDate(tagihan.waktu_registrasi)}</p>
              </div>
            )}
          </div>

          {/* Bagian 2 - Hasil Pemeriksaan Verifikator */}
          {showVerifikatorSection && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-2">Hasil Pemeriksaan Verifikator</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                <div>
                  <Label className="text-muted-foreground">Diperiksa oleh</Label>
                  <p className="font-medium">{tagihan.nama_verifikator || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Waktu Pemeriksaan</Label>
                  <p className="font-medium">{formatDate(tagihan.waktu_verifikasi)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nomor Verifikasi</Label>
                  <p className="font-medium">{tagihan.nomor_verifikasi || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status Akhir</Label>
                  <p className="font-medium">{tagihan.status_tagihan}</p>
                </div>
                {tagihan.catatan_verifikator && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Catatan Verifikator</Label>
                    <p className="font-medium">{tagihan.catatan_verifikator}</p>
                  </div>
                )}
              </div>

              <h4 className="text-md font-medium mb-2">Checklist Verifikasi</h4>
              {tagihan.id_korektor ? (
                // Simplified table for Staf Koreksi
                <Table><TableHeader><TableRow>
                      <TableHead>Uraian</TableHead><TableHead className="w-[150px] text-center">Memenuhi Syarat</TableHead><TableHead>Keterangan</TableHead>
                    </TableRow></TableHeader><TableBody>
                    <TableRow>
                      <TableCell>Tidak dapat diterbitkan SP2D</TableCell><TableCell className="text-center">Tidak</TableCell><TableCell>{tagihan.catatan_koreksi || '-'}</TableCell>
                    </TableRow>
                  </TableBody></Table>
              ) : (
                // Existing detailed table for Staf Verifikasi
                <Table><TableHeader><TableRow>
                      <TableHead>Uraian</TableHead><TableHead className="w-[150px] text-center">Memenuhi Syarat</TableHead><TableHead>Keterangan</TableHead>
                    </TableRow></TableHeader><TableBody>
                    {checklistItems.map((item, index) => {
                      const verificationDetail = tagihan.detail_verifikasi?.find(
                        (detail) => detail.item === item
                      );
                      return (
                        <TableRow key={index}>
                          <TableCell>{item}</TableCell><TableCell className="text-center">
                            {verificationDetail ? (verificationDetail.memenuhi_syarat ? 'Ya' : 'Tidak') : '-'}
                          </TableCell><TableCell>{verificationDetail?.keterangan || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody></Table>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagihanDetailDialog;