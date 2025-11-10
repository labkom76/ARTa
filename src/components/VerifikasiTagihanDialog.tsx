import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
  sumber_dana?: string;
}

interface VerifikasiTagihanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: () => void;
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

const verificationFormSchema = z.object({
  status_keputusan: z.enum(['Diteruskan', 'Dikembalikan'], {
    required_error: 'Keputusan verifikasi wajib dipilih.',
  }),
  detail_verifikasi: z.array(
    z.object({
      item: z.string(),
      memenuhi_syarat: z.boolean(),
      keterangan: z.string().optional(),
    })
  ).min(1, { message: 'Checklist verifikasi tidak boleh kosong.' }),
  durasi_penahanan: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1).max(3, { message: 'Durasi penahanan harus antara 1 hingga 3 hari.' }).optional()
  ),
}).superRefine((data, ctx) => {
  // Conditional validation for durasi_penahanan
  if (data.status_keputusan === 'Dikembalikan' && (!data.durasi_penahanan || data.durasi_penahanan < 1 || data.durasi_penahanan > 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Durasi Penahanan wajib dipilih jika status dikembalikan.',
      path: ['durasi_penahanan'],
    });
  }
});

type VerificationFormValues = z.infer<typeof verificationFormSchema>;

const VerifikasiTagihanDialog: React.FC<VerifikasiTagihanDialogProps> = ({ isOpen, onClose, onVerificationSuccess, tagihan }) => {
  const { user, profile } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableStatusOptions, setAvailableStatusOptions] = useState<Array<'Diteruskan' | 'Dikembalikan'>>([]);

  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationFormSchema),
    defaultValues: {
      status_keputusan: undefined,
      detail_verifikasi: checklistItems.map(item => ({
        item,
        memenuhi_syarat: true, // Default to true
        keterangan: '',
      })),
      durasi_penahanan: 1, // Default to 1 day
    },
  });

  // Watch for changes in detail_verifikasi and status_keputusan
  const detailVerifikasiWatch = form.watch('detail_verifikasi');
  const statusKeputusanWatch = form.watch('status_keputusan');

  // Determine if all checklist items meet requirements
  const allChecklistItemsMet = detailVerifikasiWatch.every(item => item.memenuhi_syarat === true);

  // Effect to dynamically set available status options
  useEffect(() => {
    if (allChecklistItemsMet) {
      setAvailableStatusOptions(['Diteruskan']);
      // If current selection is not 'Diteruskan', reset it
      if (statusKeputusanWatch !== 'Diteruskan') {
        form.setValue('status_keputusan', 'Diteruskan');
      }
    } else {
      setAvailableStatusOptions(['Dikembalikan']); // Only 'Dikembalikan' if not all items met
      // If current selection is not 'Dikembalikan', set it to 'Dikembalikan'
      if (statusKeputusanWatch !== 'Dikembalikan') {
        form.setValue('status_keputusan', 'Dikembalikan');
      }
    }
  }, [allChecklistItemsMet, form, statusKeputusanWatch]);


  useEffect(() => {
    if (isOpen && tagihan) {
      let initialStatusKeputusan: VerificationFormValues['status_keputusan'] | undefined;
      if (tagihan.status_tagihan === 'Dikembalikan') {
        initialStatusKeputusan = 'Dikembalikan';
      } else {
        initialStatusKeputusan = undefined; // For 'Menunggu Verifikasi'
      }

      form.reset({
        status_keputusan: initialStatusKeputusan,
        detail_verifikasi: tagihan.detail_verifikasi && tagihan.detail_verifikasi.length > 0
          ? tagihan.detail_verifikasi
          : checklistItems.map(item => ({
              item,
              memenuhi_syarat: true,
              keterangan: '',
            })),
        durasi_penahanan: 1, // Default to 1 day when opening
      });
    }
  }, [isOpen, tagihan, form]);

  if (!tagihan) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const generateNomorVerifikasi = async (): Promise<string> => {
    const now = new Date();
    const yearMonthDay = format(now, 'yyyyMMdd');
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    const endOfCurrentMonth = endOfMonth(now).toISOString();

    const { data, error } = await supabase
      .from('database_tagihan')
      .select('nomor_verifikasi')
      .not('nomor_verifikasi', 'is', null)
      .gte('waktu_verifikasi', startOfCurrentMonth)
      .lte('waktu_verifikasi', endOfCurrentMonth)
      .order('nomor_verifikasi', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last verification number:', error.message);
      throw new Error('Gagal membuat nomor verifikasi.');
    }

    let nextSequence = 1;
    if (data && data.length > 0 && data[0].nomor_verifikasi) {
      const lastNomor = data[0].nomor_verifikasi;
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
    return `VER-${yearMonthDay}-${formattedSequence}`;
  };

  const onSubmit = async (values: VerificationFormValues) => {
    if (!user || !profile?.nama_lengkap) {
      toast.error('Informasi pengguna tidak lengkap. Harap login ulang.');
      return;
    }

    // Additional check for 'Diteruskan' decision
    if (values.status_keputusan === 'Diteruskan' && !allChecklistItemsMet) {
      toast.error('Tidak dapat meneruskan tagihan. Semua item checklist harus memenuhi syarat.');
      setIsSubmitting(false);
      return;
    }

    // Additional check for 'Dikembalikan' decision
    if (values.status_keputusan === 'Dikembalikan' && allChecklistItemsMet) {
      toast.error('Tidak dapat mengembalikan tagihan. Semua item checklist sudah memenuhi syarat.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const nomorVerifikasi = await generateNomorVerifikasi();
      const now = new Date();

      let tenggatPerbaikan: string | null = null;
      if (values.status_keputusan === 'Dikembalikan') {
        if (values.durasi_penahanan && values.durasi_penahanan > 1) { // If duration is 2 or 3 days
          const tenggat = addDays(now, values.durasi_penahanan);
          tenggatPerbaikan = tenggat.toISOString();
        } else { // If duration is 1 (Default/Final)
          tenggatPerbaikan = null;
        }
      }

      const { error } = await supabase
        .from('database_tagihan')
        .update({
          status_tagihan: values.status_keputusan,
          waktu_verifikasi: now.toISOString(),
          nama_verifikator: profile.nama_lengkap,
          detail_verifikasi: values.detail_verifikasi,
          nomor_verifikasi: nomorVerifikasi,
          locked_by: null,
          locked_at: null,
          // Clear correction-related fields if it was previously 'Dikembalikan'
          nomor_koreksi: null,
          id_korektor: null,
          waktu_koreksi: null,
          catatan_koreksi: null,
          tenggat_perbaikan: tenggatPerbaikan, // NEW: Save tenggat_perbaikan
        })
        .eq('id_tagihan', tagihan.id_tagihan);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // --- START NEW NOTIFICATION LOGIC ---
      let notificationMessage = '';
      if (values.status_keputusan === 'Diteruskan') {
        notificationMessage = `Selamat! Tagihan SPM ${tagihan.nomor_spm} Anda telah DITERUSKAN.`;
      } else if (values.status_keputusan === 'Dikembalikan') {
        notificationMessage = `Perhatian! Tagihan SPM ${tagihan.nomor_spm} DIKEMBALIKAN.`;
        if (tenggatPerbaikan) { // Only add deadline if tenggatPerbaikan exists
          const formattedTenggat = format(parseISO(tenggatPerbaikan), 'dd MMMM yyyy', { locale: localeId });
          notificationMessage += ` Harap perbaiki sebelum ${formattedTenggat}.`;
        }
      }

      if (notificationMessage) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: tagihan.id_pengguna_input, // ID pengguna SKPD
            message: notificationMessage,
            is_read: false,
            tagihan_id: tagihan.id_tagihan, // Include tagihan_id
            tenggat_perbaikan: tenggatPerbaikan, // NEW: Include tenggat_perbaikan in notification
          });

        if (notificationError) {
          console.error('Error inserting notification:', notificationError.message);
          // Don't throw error here, as tagihan update is more critical
        }
      }
      // --- END NEW NOTIFICATION LOGIC ---

      toast.success(`Tagihan ${tagihan.nomor_spm} berhasil ${values.status_keputusan.toLowerCase()}!`);
      onVerificationSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error processing verifikasi:', error.message);
      toast.error('Gagal memproses verifikasi: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonVariant = (status: 'Diteruskan' | 'Dikembalikan' | undefined) => {
    if (status === 'Diteruskan') return 'default';
    if (status === 'Dikembalikan') return 'destructive';
    return 'secondary';
  };

  // Determine if the submit button should be disabled
  const isSubmitButtonDisabled = isSubmitting || !statusKeputusanWatch ||
    (statusKeputusanWatch === 'Diteruskan' && !allChecklistItemsMet) ||
    (statusKeputusanWatch === 'Dikembalikan' && allChecklistItemsMet);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Verifikasi Tagihan: {tagihan.nomor_spm}</DialogTitle>
          <DialogDescription>
            Periksa detail tagihan dan tentukan keputusan verifikasi.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <form id="verification-form" onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 py-4">
            {/* Detail Tagihan */}
            <div className="grid gap-2">
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
                {/* Removed duplicated Nomor SPM */}
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

            {/* Checklist Verifikasi */}
            <div className="grid gap-2 mt-4">
              <h3 className="text-lg font-semibold">Checklist Verifikasi</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Uraian</TableHead>
                    <TableHead className="w-[120px] text-center">Memenuhi Syarat</TableHead>
                    <TableHead></TableHead> {/* Empty header for the new row's content */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklistItems.map((item, index) => (
                    <React.Fragment key={item}>
                      <TableRow>
                        <TableCell className="flex items-center">{item}</TableCell>
                        <TableCell className="text-center">
                          <Controller
                            name={`detail_verifikasi.${index}.memenuhi_syarat`}
                            control={form.control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell></TableCell> {/* Empty cell for alignment */}
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3}> {/* Span across all columns */}
                          <Controller
                            name={`detail_verifikasi.${index}.keterangan`}
                            control={form.control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                placeholder="Keterangan (opsional)"
                                className="h-8 w-full mt-2"
                                disabled={detailVerifikasiWatch[index]?.memenuhi_syarat}
                              />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
              {form.formState.errors.detail_verifikasi && (
                <p className="text-red-500 text-sm mt-2">
                  {form.formState.errors.detail_verifikasi.message}
                </p>
              )}
            </div>

            {/* Keputusan Verifikasi */}
            <div className="grid gap-2 mt-4">
              <Label htmlFor="status_keputusan" className="text-lg font-semibold">Keputusan Verifikasi</Label>
              <Controller
                name="status_keputusan"
                control={form.control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Keputusan" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatusOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.status_keputusan && (
                <p className="text-red-500 text-sm">
                  {form.formState.errors.status_keputusan.message}
                </p>
              )}
            </div>

            {/* NEW: Durasi Penahanan (Kondisional) */}
            {statusKeputusanWatch === 'Dikembalikan' && (
              <div className="grid gap-2 mt-4">
                <Label htmlFor="durasi_penahanan" className="text-lg font-semibold">Durasi Penahanan (Opsional)</Label>
                <Controller
                  name="durasi_penahanan"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Durasi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Default (Final)</SelectItem>
                        <SelectItem value="2">2 Hari</SelectItem>
                        <SelectItem value="3">3 Hari</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.durasi_penahanan && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.durasi_penahanan.message}
                  </p>
                )}
              </div>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            form="verification-form" // Link button to the form by its ID
            className="w-full"
            variant={getButtonVariant(statusKeputusanWatch)}
            disabled={isSubmitButtonDisabled}
          >
            {isSubmitting ? 'Memproses...' : `Proses Tagihan (${statusKeputusanWatch || 'Pilih Keputusan'})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerifikasiTagihanDialog;