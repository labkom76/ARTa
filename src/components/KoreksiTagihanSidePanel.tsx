import React, { useState, useEffect, useCallback } from 'react';
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
} from '@/components/ui/sheet';

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
  catatan_koreksi?: string;
}

interface KoreksiTagihanSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCorrectionSuccess: () => void;
  tagihan: Tagihan | null;
}

const koreksiFormSchema = z.object({
  keterangan_koreksi: z.string().min(1, { message: 'Keterangan koreksi wajib diisi.' }),
});

type KoreksiFormValues = z.infer<typeof koreksiFormSchema>;

const KoreksiTagihanSidePanel: React.FC<KoreksiTagihanSidePanelProps> = ({ isOpen, onClose, onCorrectionSuccess, tagihan }) => {
  const { user, profile } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedNomorKoreksi, setGeneratedNomorKoreksi] = useState<string | null>(null);

  const form = useForm<KoreksiFormValues>({
    resolver: zodResolver(koreksiFormSchema),
    defaultValues: {
      keterangan_koreksi: '',
    },
  });

  const generateNomorKoreksi = useCallback(async (originalNomorRegistrasi: string): Promise<string> => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    const endOfCurrentMonth = endOfMonth(now).toISOString();

    const { data, error } = await supabase
      .from('database_tagihan')
      .select('nomor_koreksi')
      .ilike('nomor_koreksi', `${originalNomorRegistrasi}-K-%`)
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
      const parts = lastNomor.split('-K-');
      if (parts.length === 2) {
        const sequencePart = parts[1];
        const lastSequenceNum = parseInt(sequencePart, 10);
        if (!isNaN(lastSequenceNum)) {
          nextSequence = lastSequenceNum + 1;
        }
      }
    }

    const formattedSequence = String(nextSequence).padStart(3, '0');
    return `${originalNomorRegistrasi}-K-${formattedSequence}`;
  }, []);

  useEffect(() => {
    if (isOpen && tagihan?.nomor_registrasi) {
      form.reset({
        keterangan_koreksi: tagihan.catatan_koreksi || '',
      });
      const generateAndSetNomor = async () => {
        try {
          const newNomor = await generateNomorKoreksi(tagihan.nomor_registrasi!);
          setGeneratedNomorKoreksi(newNomor);
        } catch (error: any) {
          toast.error(error.message);
          setGeneratedNomorKoreksi(null);
        }
      };
      generateAndSetNomor();
    } else if (!isOpen) {
      setGeneratedNomorKoreksi(null);
    }
  }, [isOpen, tagihan, form, generateNomorKoreksi]);

  if (!tagihan) {
    return null;
  }

  const onSubmit = async (values: KoreksiFormValues) => {
    if (!user || !profile?.nama_lengkap) {
      toast.error('Informasi pengguna tidak lengkap. Harap login ulang.');
      return;
    }
    if (!generatedNomorKoreksi) {
      toast.error('Nomor koreksi belum dibuat. Silakan coba lagi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('database_tagihan')
        .update({
          status_tagihan: 'Dikembalikan',
          catatan_koreksi: values.keterangan_koreksi,
          id_korektor: user.id,
          waktu_koreksi: now,
          nomor_koreksi: generatedNomorKoreksi,
          waktu_verifikasi: now,
          nama_verifikator: profile.nama_lengkap,
          nomor_verifikasi: generatedNomorKoreksi,
          locked_by: null,
          locked_at: null,
        })
        .eq('id_tagihan', tagihan.id_tagihan);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      toast.success(`Tagihan ${tagihan.nomor_spm} berhasil dikoreksi dan dikembalikan.`);
      onCorrectionSuccess();
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
          <SheetTitle>Konfirmasi Pengembalian</SheetTitle>
          {/* <SheetDescription>
            Periksa detail tagihan dan masukkan keterangan koreksi.
          </SheetDescription> */}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            {/* Area 1: Header & Nomor Koreksi */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Nomor Koreksi</h3>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{generatedNomorKoreksi || 'Membuat...'}</p>
            </div>

            {/* Area 2: Detail Ringkas Tagihan */}
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
                  <Label className="text-muted-foreground">Jumlah Kotor</Label>
                  <p className="font-medium">Rp{tagihan.jumlah_kotor?.toLocaleString('id-ID') || '0'}</p>
                </div>
              </div>
            </div>

            {/* Area 3: Input Koreksi (Interaktif) */}
            <div className="flex-1 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Input Koreksi</h3>
              <div className="mb-4">
                <Label className="text-muted-foreground">Uraian:</Label>
                <p className="font-medium">"Tidak dapat diterbitkan SP2D"</p>
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

            {/* Area 4: Tombol Aksi */}
            <Button type="submit" className="w-full mt-auto" variant="destructive" disabled={isSubmitting || !generatedNomorKoreksi}>
              {isSubmitting ? 'Memproses...' : 'Proses Pengembalian'}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KoreksiTagihanSidePanel;