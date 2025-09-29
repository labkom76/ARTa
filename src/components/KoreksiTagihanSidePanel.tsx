import React, { useState, useEffect } from 'react';
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
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'; // Import Sheet components

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
  nomor_registrasi?: string;
  waktu_registrasi?: string;
  nama_registrator?: string;
  catatan_verifikator?: string;
  waktu_verifikasi?: string;
  detail_verifikasi?: VerificationItem[];
  nomor_verifikasi?: string;
  nama_verifikator?: string;
  locked_by?: string;
  locked_at?: string;
  nomor_koreksi?: string;
  id_korektor?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string; // Added new field
}

interface KoreksiTagihanSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCorrectionSuccess: () => void; // New prop to trigger refresh
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

const koreksiFormSchema = z.object({
  keterangan_koreksi: z.string().min(1, { message: 'Keterangan koreksi wajib diisi.' }),
});

type KoreksiFormValues = z.infer<typeof koreksiFormSchema>;

const KoreksiTagihanSidePanel: React.FC<KoreksiTagihanSidePanelProps> = ({ isOpen, onClose, onCorrectionSuccess, tagihan }) => {
  const { user, profile } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KoreksiFormValues>({
    resolver: zodResolver(koreksiFormSchema),
    defaultValues: {
      keterangan_koreksi: '',
    },
  });

  useEffect(() => {
    if (isOpen && tagihan) {
      form.reset({
        keterangan_koreksi: tagihan.catatan_koreksi || '',
      });
    }
  }, [isOpen, tagihan, form]);

  if (!tagihan) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const generateNomorKoreksi = async (): Promise<string> => {
    const now = new Date();
    const yearMonthDay = format(now, 'yyyyMMdd');
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    const endOfCurrentMonth = endOfMonth(now).toISOString();

    const { data, error } = await supabase
      .from('database_tagihan')
      .select('nomor_koreksi')
      .not('nomor_koreksi', 'is', null)
      .gte('waktu_koreksi', startOfCurrentMonth)
      .lte('waktu_koreksi', endOfCurrentMonth)
      .order('nomor_koreksi', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last correction number:', error.message);
      throw new Error('Gagal membuat nomor koreksi.');
    }

    let nextSequence = 1;
    if (data && data.length > 0 && data[0].nomor_koreksi) {
      const lastNomor = data[0].nomor_koreksi;
      const parts = lastNomor.split('-');
      if (parts.length === 3) {
        const lastSequenceStr = parts[2];
        const lastSequenceNum = parseInt(lastSequenceStr, 10);
        if (!isNaN(lastSequenceNum)) {
          nextSequence = lastSequenceNum + 1;
        }
      }
    }

    const formattedSequence = String(nextSequence).padStart(4, '0');
    return `KOR-${yearMonthDay}-${formattedSequence}`;
  };

  const onSubmit = async (values: KoreksiFormValues) => {
    if (!user || !profile?.nama_lengkap) {
      toast.error('Informasi pengguna tidak lengkap. Harap login ulang.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nomorKoreksi = await generateNomorKoreksi();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('database_tagihan')
        .update({
          status_tagihan: 'Dikembalikan', // Staf Koreksi mengembalikan ke SKPD
          catatan_koreksi: values.keterangan_koreksi,
          id_korektor: user.id,
          waktu_koreksi: now,
          nomor_koreksi: nomorKoreksi,
          // Also update verification related fields to reflect this action in history
          waktu_verifikasi: now, // Treat correction as a form of verification action for history purposes
          nama_verifikator: profile.nama_lengkap, // Corrector's name as verifier for history
          nomor_verifikasi: nomorKoreksi, // Use correction number as verification number for history
          locked_by: null, // Clear lock
          locked_at: null, // Clear lock
        })
        .eq('id_tagihan', tagihan.id_tagihan);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      toast.success(`Tagihan ${tagihan.nomor_spm} berhasil dikoreksi dan dikembalikan.`);
      onCorrectionSuccess(); // Trigger refresh in parent
      onClose();
    } catch (error: any) {
      console.error('Error processing correction:', error.message);
      toast.error('Gagal memproses koreksi: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Koreksi Tagihan: {tagihan.nomor_spm}</SheetTitle>
          <SheetDescription>
            Periksa detail tagihan dan masukkan keterangan koreksi.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Area 1: Detail Tagihan */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Detail Tagihan</h3>
              <div className="grid grid-cols-1 gap-y-2 text-sm">
                <div>
                  <Label className="text-muted-foreground">Nomor SPM</Label>
                  <p className="font-medium">{tagihan.nomor_spm || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nama SKPD</Label>
                  <p className="font-medium">{tagihan.nama_skpd || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jenis SPM</Label>
                  <p className="font-medium">{tagihan.jenis_spm || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jenis Tagihan</Label>
                  <p className="font-medium">{tagihan.jenis_tagihan || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Uraian</Label>
                  <p className="font-medium">{tagihan.uraian || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jumlah Kotor</Label>
                  <p className="font-medium">Rp{tagihan.jumlah_kotor?.toLocaleString('id-ID') || '0'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status Tagihan</Label>
                  <p className="font-medium">{tagihan.status_tagihan || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Waktu Registrasi</Label>
                  <p className="font-medium">{formatDate(tagihan.waktu_registrasi)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nomor Registrasi</Label>
                  <p className="font-medium">{tagihan.nomor_registrasi || '-'}</p>
                </div>
              </div>
            </div>

            {/* Area 2: Hasil Verifikasi Sebelumnya */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Hasil Verifikasi Sebelumnya</h3>
              <div className="text-sm mb-2">
                <Label className="text-muted-foreground">Catatan Verifikator:</Label>
                <p className="font-medium">{tagihan.catatan_verifikator || '-'}</p>
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
                    const verificationDetail = tagihan.detail_verifikasi?.find(
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
            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Input Koreksi</h3>
              <div className="mb-4">
                <Label className="text-muted-foreground">Penyebab:</Label>
                <p className="font-medium text-red-600">"Tidak dapat diterbitkan SP2D"</p>
              </div>
              <div className="grid gap-2 mb-4 flex-1">
                <Label htmlFor="keterangan-koreksi">Keterangan</Label>
                <Textarea
                  id="keterangan-koreksi"
                  {...form.register('keterangan_koreksi')}
                  placeholder="Masukkan keterangan koreksi..."
                  rows={4}
                  className="flex-1"
                />
                {form.formState.errors.keterangan_koreksi && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.keterangan_koreksi.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full mt-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Mengkonfirmasi...' : 'Konfirmasi Pengembalian'}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KoreksiTagihanSidePanel;