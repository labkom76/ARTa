import React, { useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext'; // Import useSession
import { format } from 'date-fns'; // Import format for current year
import { generateNomorSpm, getJenisTagihanCode } from '@/utils/spmGenerator'; // Import utility functions

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
  kode_jadwal?: string; // Add kode_jadwal
  nomor_urut?: number; // Add nomor_urut
  sumber_dana?: string; // Add sumber_dana
}

interface ScheduleOption {
  id: string;
  kode_jadwal: string;
  deskripsi_jadwal: string;
}

interface EditTagihanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTagihanUpdated: () => void;
  editingTagihan: Tagihan | null;
}

const formSchema = z.object({
  nama_skpd: z.string().min(1, { message: 'Nama SKPD wajib diisi.' }),
  // nomor_spm: z.string().min(1, { message: 'Nomor SPM wajib diisi.' }), // This will be generated
  uraian: z.string().min(1, { message: 'Uraian wajib diisi.' }),
  jumlah_kotor: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: 'Jumlah Kotor harus angka positif.' })
  ),
  jenis_spm: z.string().min(1, { message: 'Jenis SPM wajib dipilih.' }),
  jenis_tagihan: z.string().min(1, { message: 'Jenis Tagihan wajib dipilih.' }),
  status_tagihan: z.enum(['Menunggu Registrasi', 'Menunggu Verifikasi', 'Diteruskan', 'Dikembalikan'], {
    required_error: 'Status Tagihan wajib dipilih.',
  }),
  kode_jadwal: z.string().min(1, { message: 'Kode Jadwal Penganggaran wajib dipilih.' }), // New field
  nomor_urut_tagihan: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: 'Nomor Urut Tagihan wajib diisi dan harus angka positif.' })
  ),
  sumber_dana: z.string().min(1, { message: 'Sumber Dana wajib dipilih.' }), // New field for Sumber Dana
});

type EditTagihanFormValues = z.infer<typeof formSchema>;

const EditTagihanDialog: React.FC<EditTagihanDialogProps> = ({ isOpen, onClose, onTagihanUpdated, editingTagihan }) => {
  const { profile } = useSession(); // Use session to get current user's SKPD
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]);
  const [kodeWilayah, setKodeWilayah] = useState<string | null>(null);
  const [kodeSkpd, setKodeSkpd] = useState<string | null>(null);
  const [generatedNomorSpmPreview, setGeneratedNomorSpmPreview] = useState<string | null>(null);

  const form = useForm<EditTagihanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_skpd: '',
      // nomor_spm: '', // Removed from defaultValues
      uraian: '',
      jumlah_kotor: 0,
      jenis_spm: '',
      jenis_tagihan: '',
      status_tagihan: 'Menunggu Registrasi',
      kode_jadwal: '',
      nomor_urut_tagihan: 1,
      sumber_dana: '', // Default value for new field
    },
  });

  const jenisTagihanWatch = form.watch('jenis_tagihan');
  const kodeJadwalWatch = form.watch('kode_jadwal');
  const nomorUrutTagihanWatch = form.watch('nomor_urut_tagihan');
  const namaSkpdWatch = form.watch('nama_skpd'); // Watch nama_skpd for kode_skpd lookup

  // Fetch Kode Wilayah from app_settings
  useEffect(() => {
    const fetchAppSetting = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'kode_wilayah')
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching kode_wilayah:', error.message);
        toast.error('Gagal memuat Kode Wilayah.');
      } else if (data) {
        setKodeWilayah(data.value);
      }
    };
    fetchAppSetting();
  }, []);

  // Fetch Kode SKPD based on nama_skpd in the form
  useEffect(() => {
    const fetchKodeSkpd = async () => {
      if (namaSkpdWatch) {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('kode_skpd')
          .eq('nama_skpd', namaSkpdWatch)
          .single();
        if (error) {
          console.error('Error fetching kode_skpd for ' + namaSkpdWatch + ':', error.message);
          // toast.error('Gagal memuat Kode SKPD untuk SKPD ini.'); // Don't spam toast
          setKodeSkpd(null);
        } else if (data) {
          setKodeSkpd(data.kode_skpd);
        }
      } else {
        setKodeSkpd(null);
      }
    };
    fetchKodeSkpd();
  }, [namaSkpdWatch]);

  // Fetch active schedule options
  useEffect(() => {
    const fetchScheduleOptions = async () => {
      const { data, error } = await supabase
        .from('master_jadwal')
        .select('id, kode_jadwal, deskripsi_jadwal')
        .eq('is_active', true)
        .order('kode_jadwal', { ascending: true });
      if (error) {
        console.error('Error fetching schedule options:', error.message);
        toast.error('Gagal memuat daftar jadwal penganggaran.');
        setScheduleOptions([]);
      } else {
        setScheduleOptions(data || []);
      }
    };
    fetchScheduleOptions();
  }, []);

  // Effect to trigger SPM number generation for preview
  useEffect(() => {
    const updateNomorSpmPreview = async () => {
      if (jenisTagihanWatch && kodeJadwalWatch && kodeSkpd && kodeWilayah && nomorUrutTagihanWatch !== null && nomorUrutTagihanWatch !== undefined) {
        const newNomorSpm = generateNomorSpm(jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch);
        setGeneratedNomorSpmPreview(newNomorSpm);
      } else {
        setGeneratedNomorSpmPreview(null);
      }
    };
    updateNomorSpmPreview();
  }, [jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch]);


  useEffect(() => {
    if (isOpen && editingTagihan) {
      form.reset({
        nama_skpd: editingTagihan.nama_skpd,
        // nomor_spm: editingTagihan.nomor_spm, // No longer directly set
        uraian: editingTagihan.uraian,
        jumlah_kotor: editingTagihan.jumlah_kotor,
        jenis_spm: editingTagihan.jenis_spm,
        jenis_tagihan: editingTagihan.jenis_tagihan,
        status_tagihan: editingTagihan.status_tagihan as EditTagihanFormValues['status_tagihan'],
        kode_jadwal: editingTagihan.kode_jadwal || '',
        nomor_urut_tagihan: editingTagihan.nomor_urut || 1, // Menggunakan nomor_urut langsung
        sumber_dana: editingTagihan.sumber_dana || '', // Set sumber_dana for editing
      });
    } else if (isOpen && !editingTagihan) {
      form.reset(); // Reset form if no editingTagihan (shouldn't happen for this dialog)
    }
  }, [isOpen, editingTagihan, form]);

  // --- FUNGSI BARU: isNomorSpmDuplicate (MODIFIED) ---
  const isNomorSpmDuplicate = useCallback(async (
    nomorUrutToCheck: number,
    namaSkpd: string,
    kodeJadwal: string,
    currentYear: string,
    excludeTagihanId: string | null = null // Add parameter to exclude current tagihan during edit
  ): Promise<boolean> => {
    try {
      let query = supabase
        .from('database_tagihan')
        .select('id_tagihan', { count: 'exact', head: true })
        .eq('nomor_urut', nomorUrutToCheck)
        .eq('nama_skpd', namaSkpd)
        .eq('kode_jadwal', kodeJadwal)
        .like('nomor_spm', `%/${currentYear}`);

      if (excludeTagihanId) {
        query = query.neq('id_tagihan', excludeTagihanId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Error checking for duplicate nomor_urut:', error.message);
        throw error;
      }

      return (count || 0) > 0;
    } catch (error: any) {
      console.error('Exception in isNomorSpmDuplicate:', error.message);
      return false;
    }
  }, []);
  // --- AKHIR FUNGSI BARU ---

  const onSubmit = async (values: EditTagihanFormValues) => {
    if (!editingTagihan) return;

    setIsSubmitting(true);
    try {
      // Re-generate Nomor SPM based on current form values
      if (!kodeSkpd || !kodeWilayah) {
        toast.error('Kode SKPD atau Kode Wilayah tidak tersedia. Gagal memperbarui Nomor SPM.');
        setIsSubmitting(false);
        return;
      }

      const newNomorSpm = generateNomorSpm(
        values.jenis_tagihan,
        values.kode_jadwal,
        kodeSkpd,
        kodeWilayah,
        values.nomor_urut_tagihan
      );

      if (!newNomorSpm) {
        toast.error('Gagal membuat Nomor SPM baru. Harap periksa input.');
        setIsSubmitting(false);
        return;
      }

      // Check for duplicate nomor_urut if any relevant field has changed
      const currentYear = format(new Date(), 'yyyy');
      const hasRelevantFieldsChanged =
        values.nomor_urut_tagihan !== editingTagihan.nomor_urut ||
        values.nama_skpd !== editingTagihan.nama_skpd ||
        values.kode_jadwal !== editingTagihan.kode_jadwal;

      if (hasRelevantFieldsChanged) {
        const isDuplicate = await isNomorSpmDuplicate(
          values.nomor_urut_tagihan,
          values.nama_skpd,
          values.kode_jadwal,
          currentYear,
          editingTagihan.id_tagihan // Exclude current tagihan from duplicate check
        );

        if (isDuplicate) {
          toast.error('Nomor Urut Tagihan ini sudah digunakan untuk SKPD dan Jadwal yang sama di tahun ini. Silakan gunakan nomor lain.');
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('database_tagihan')
        .update({
          nama_skpd: values.nama_skpd,
          nomor_spm: newNomorSpm, // Update with the newly generated SPM
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          status_tagihan: values.status_tagihan,
          kode_jadwal: values.kode_jadwal, // Update kode_jadwal
          nomor_urut: values.nomor_urut_tagihan, // Update nomor_urut
          sumber_dana: values.sumber_dana, // Update sumber_dana
        })
        .eq('id_tagihan', editingTagihan.id_tagihan);

      if (error) throw error;

      toast.success('Tagihan berhasil diperbarui oleh Administrator!');
      onTagihanUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating tagihan:', error.message);
      toast.error('Gagal memperbarui tagihan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tagihan (Admin Override)</DialogTitle>
          <DialogDescription>
            Perbarui detail tagihan ini. Semua field dapat diedit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nama_skpd" className="text-right">
              Nama SKPD
            </Label>
            <Input
              id="nama_skpd"
              {...form.register('nama_skpd')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.nama_skpd && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.nama_skpd.message}
              </p>
            )}
          </div>
          {/* Pratinjau Nomor SPM Otomatis */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nomor_spm_otomatis" className="text-right">
              Nomor SPM (Otomatis)
            </Label>
            <Input
              id="nomor_spm_otomatis"
              value={generatedNomorSpmPreview || 'Membuat Nomor SPM...'}
              readOnly
              className="col-span-3 font-mono text-sm"
              disabled={true} // Always disabled as it's a preview
            />
          </div>
          {/* Input Nomor Urut Tagihan */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nomor_urut_tagihan" className="text-right">
              Nomor Urut Tagihan
            </Label>
            <Input
              id="nomor_urut_tagihan"
              type="number"
              {...form.register('nomor_urut_tagihan', { valueAsNumber: true })}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.nomor_urut_tagihan && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.nomor_urut_tagihan.message}
              </p>
            )}
          </div>
          {/* Jadwal Penganggaran */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="kode_jadwal" className="text-right">
              Jadwal Penganggaran
            </Label>
            <Controller
              name="kode_jadwal"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Jadwal" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.kode_jadwal}>
                        {schedule.deskripsi_jadwal} ({schedule.kode_jadwal})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.kode_jadwal && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.kode_jadwal.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="jenis_spm" className="text-right">
              Jenis SPM
            </Label>
            <Controller
              name="jenis_spm"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Jenis SPM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Belanja Pegawai">Belanja Pegawai</SelectItem>
                    <SelectItem value="Belanja Barang dan Jasa">Belanja Barang dan Jasa</SelectItem>
                    <SelectItem value="Belanja Modal">Belanja Modal</SelectItem>
                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.jenis_spm && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.jenis_spm.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="jenis_tagihan" className="text-right">
              Jenis Tagihan
            </Label>
            <Controller
              name="jenis_tagihan"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Jenis Tagihan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uang Persediaan (UP)">Uang Persediaan (UP)</SelectItem>
                    <SelectItem value="Ganti Uang Persediaan (GU)">Ganti Uang Persediaan (GU)</SelectItem>
                    <SelectItem value="Langsung (LS)">Langsung (LS)</SelectItem>
                    <SelectItem value="Tambah Uang Persediaan (TU)">Tambah Uang Persediaan (TU)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.jenis_tagihan && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.jenis_tagihan.message}
              </p>
            )}
          </div>
          {/* New: Sumber Dana Dropdown */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sumber_dana" className="text-right">
              Sumber Dana
            </Label>
            <Controller
              name="sumber_dana"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Sumber Dana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendapatan Asli Daerah">Pendapatan Asli Daerah</SelectItem>
                    <SelectItem value="Dana Bagi Hasil">Dana Bagi Hasil</SelectItem>
                    <SelectItem value="DAU - BG">DAU - BG</SelectItem>
                    <SelectItem value="DAU - SG">DAU - SG</SelectItem>
                    <SelectItem value="DAK - Fisik">DAK - Fisik</SelectItem>
                    <SelectItem value="DAK - Non Fisik">DAK - Non Fisik</SelectItem>
                    <SelectItem value="Dana Desa">Dana Desa</SelectItem>
                    <SelectItem value="Insentif Fiskal">Insentif Fiskal</SelectItem>
                    <SelectItem value="Pendapatan Transfer Antar Daerah">Pendapatan Transfer Antar Daerah</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.sumber_dana && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.sumber_dana.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="uraian" className="text-right">
              Uraian
            </Label>
            <Textarea
              id="uraian"
              {...form.register('uraian')}
              className="col-span-3"
              rows={3}
              disabled={isSubmitting}
            />
            {form.formState.errors.uraian && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.uraian.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="jumlah_kotor" className="text-right">
              Jumlah Kotor
            </Label>
            <Input
              id="jumlah_kotor"
              type="number"
              {...form.register('jumlah_kotor')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.jumlah_kotor && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.jumlah_kotor.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status_tagihan" className="text-right">
              Status Tagihan
            </Label>
            <Controller
              name="status_tagihan"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                    <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                    <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                    <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.status_tagihan && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.status_tagihan.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTagihanDialog;