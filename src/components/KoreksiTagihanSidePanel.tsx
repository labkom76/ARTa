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
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Import Select components

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
  sumber_dana?: string; // Add sumber_dana
}

interface KoreksiTagihanSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCorrectionSuccess: () => void;
  tagihan: Tagihan | null;
}

const koreksiFormSchema = z.object({
  keterangan_koreksi: z.enum([
    'Kas sumber dana tidak cukup tersedia',
    'Kas sumber dana tidak cukup tersedia, prioritas belanja wajib rutin bulanan',
  ], {
    required_error: 'Keterangan koreksi wajib dipilih.',
  }),
});

type KoreksiFormValues = z.infer<typeof koreksiFormSchema>;

const KoreksiTagihanSidePanel: React.FC<KoreksiTagihanSidePanelProps> = ({ isOpen, onClose, onCorrectionSuccess, tagihan }) => {
  const { user, profile } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedNomorKoreksi, setGeneratedNomorKoreksi] = useState<string | null>(null);

  const form = useForm<KoreksiFormValues>({
    resolver: zodResolver(koreksiFormSchema),
    defaultValues: {
      keterangan_koreksi: undefined, // Set to undefined for initial empty state
    },
  });

  // Helper function to generate the monthly correction sequence (e.g., '0020')
  const generateMonthlyCorrectionSequence = useCallback(async (): Promise<string> => {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    const endOfCurrentMonth = endOfMonth(now).toISOString();

    // Fetch all nomor_koreksi for the current month to find the highest sequence
    const { data, error } = await supabase
      .from('database_tagihan')
      .select('nomor_koreksi')
      .not('nomor_koreksi', 'is', null)
      .gte('waktu_koreksi', startOfCurrentMonth)
      .lte('waktu_koreksi', endOfCurrentMonth);

    if (error) {
      console.error('Error fetching last correction number for sequence:', error.message);
      throw new Error('Gagal membuat nomor urut koreksi bulanan.');
    }

    let nextSequence = 1;
    if (data && data.length > 0) {
      let maxSequence = 0;
      data.forEach(item => {
        if (item.nomor_koreksi) {
          // Expected format: [NNNN]-K-[MMM]
          const parts = item.nomor_koreksi.split('-K-');
          if (parts.length === 2) {
            const sequencePart = parseInt(parts[1], 10); // This is the monthly correction sequence
            if (!isNaN(sequencePart) && sequencePart > maxSequence) {
              maxSequence = sequencePart;
            }
          }
        }
      });
      nextSequence = maxSequence + 1;
    }

    return String(nextSequence).padStart(4, '0'); // Pad with 4 zeros for monthly sequence
  }, []);

  // Main function to generate the full nomor_koreksi
  const generateFullNomorKoreksi = useCallback(async (originalNomorRegistrasi: string): Promise<string> => {
    // Extract only the sequence number from originalNomorRegistrasi (e.g., '0010' from 'REG-20250930-0010')
    const regParts = originalNomorRegistrasi.split('-');
    const registrationSequence = regParts.length === 3 ? regParts[2] : originalNomorRegistrasi; // Fallback if format is unexpected

    const monthlyCorrectionSequence = await generateMonthlyCorrectionSequence();
    return `${parseInt(registrationSequence, 10)}-K-${monthlyCorrectionSequence}`; // Convert to int to remove leading zeros if any, then back to string
  }, [generateMonthlyCorrectionSequence]);

  useEffect(() => {
    if (isOpen && tagihan?.nomor_registrasi) {
      form.reset({
        keterangan_koreksi: tagihan.catatan_koreksi as KoreksiFormValues['keterangan_koreksi'] || undefined,
      });
      const generateAndSetNomor = async () => {
        try {
          const newNomor = await generateFullNomorKoreksi(tagihan.nomor_registrasi!);
          setGeneratedNomorKoreksi(newNomor);
        } catch (error: any) {
          toast.error(error.message);
          setGeneratedNomorKoreksi(null);
        }
      };
      generateAndSetNomor();
    } else if (!isOpen) {
      setGeneratedNomorKoreksi(null);
      form.reset({ keterangan_koreksi: undefined }); // Reset dropdown on close
    }
  }, [isOpen, tagihan, form, generateFullNomorKoreksi]);

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
          // Also update verification related fields to reflect this action in history
          waktu_verifikasi: now, // Treat correction as a form of verification action for history purposes
          nama_verifikator: profile.nama_lengkap, // Corrector's name as verifier for history
          nomor_verifikasi: generatedNomorKoreksi, // Use correction number as verification number for history
          locked_by: null, // Clear lock
          locked_at: null, // Clear lock
        })
        .eq('id_tagihan', tagihan.id_tagihan);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // --- START NEW NOTIFICATION LOGIC ---
      const notificationMessage = `Perhatian! Tagihan SPM ${tagihan.nomor_spm} DIKEMBALIKAN oleh Staf Koreksi.`;
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: tagihan.id_pengguna_input, // ID pengguna SKPD
          message: notificationMessage,
          is_read: false,
        });

      if (notificationError) {
        console.error('Error inserting notification:', notificationError.message);
        // Don't throw error here, as tagihan update is more critical
      }
      // --- END NEW NOTIFICATION LOGIC ---

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

            {/* Area 2: Detail Tagihan (Updated to match VerifikasiTagihanDialog) */}
            <div className="grid gap-2 mb-6">
              <h3 className="text-lg font-semibold">Detail Tagihan</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <Label className="text-muted-foreground">Nomor Registrasi</Label>
                  <p className="font-medium">{tagihan.nomor_registrasi || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Waktu Registrasi</Label>
                  <p className="font-medium">{formatDate(tagihan.waktu_registrasi)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nama SKPD</Label>
                  <p className="font-medium">{tagihan.nama_skpd}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nomor SPM</Label>
                  <p className="font-medium">{tagihan.nomor_spm}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jenis SPM</Label>
                  <p className="font-medium">{tagihan.jenis_spm}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Jenis Tagihan</Label>
                  <p className="font-medium">{tagihan.jenis_tagihan}</p>
                </div>
                {/* New: Sumber Dana */}
                <div>
                  <Label className="text-muted-foreground">Sumber Dana</Label>
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
                <Controller
                  name="keterangan_koreksi"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Keterangan Koreksi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kas sumber dana tidak cukup tersedia">Kas sumber dana tidak cukup tersedia</SelectItem>
                        <SelectItem value="Kas sumber dana tidak cukup tersedia, prioritas belanja wajib rutin bulanan">Kas sumber dana tidak cukup tersedia, prioritas belanja wajib rutin bulanan</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.keterangan_koreksi && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.keterangan_koreksi.message}
                  </p>
                )}
              </div>
            </div>

            {/* Area 4: Tombol Aksi */}
            <Button type="submit" className="w-full mt-auto" variant="destructive" disabled={isSubmitting || !generatedNomorKoreksi || !form.formState.isValid}>
              {isSubmitting ? 'Memproses...' : 'Proses Pengembalian'}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KoreksiTagihanSidePanel;