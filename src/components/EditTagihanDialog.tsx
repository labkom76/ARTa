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
import { useSession } from '@/contexts/SessionContext';
import { format } from 'date-fns';
import { generateNomorSpm, getJenisTagihanCode } from '@/utils/spmGenerator';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  kode_jadwal?: string;
  nomor_urut?: number;
  sumber_dana?: string;
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
  verifierOptions: { value: string; label: string }[];
}

const formSchema = z.object({
  nama_skpd: z.string().min(1, { message: 'Nama SKPD wajib diisi.' }),
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
  kode_jadwal: z.string().min(1, { message: 'Kode Jadwal Penganggaran wajib dipilih.' }),
  nomor_urut_tagihan: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: 'Nomor Urut Tagihan wajib diisi dan harus angka positif.' })
  ),
  sumber_dana: z.string().min(1, { message: 'Sumber Dana wajib dipilih.' }),
});

type EditTagihanFormValues = z.infer<typeof formSchema>;

const EditTagihanDialog: React.FC<EditTagihanDialogProps> = ({ isOpen, onClose, onTagihanUpdated, editingTagihan, verifierOptions }) => {
  const { profile } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]);
  const [kodeWilayah, setKodeWilayah] = useState<string | null>(null);
  const [kodeSkpd, setKodeSkpd] = useState<string | null>(null);
  const [generatedNomorSpmPreview, setGeneratedNomorSpmPreview] = useState<string | null>(null);
  const [selectedVerifier, setSelectedVerifier] = useState<string>('');

  const form = useForm<EditTagihanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_skpd: '',
      uraian: '',
      jumlah_kotor: 0,
      jenis_spm: '',
      jenis_tagihan: '',
      status_tagihan: 'Menunggu Registrasi',
      kode_jadwal: '',
      nomor_urut_tagihan: 1,
      sumber_dana: '',
    },
  });

  const jenisTagihanWatch = form.watch('jenis_tagihan');
  const kodeJadwalWatch = form.watch('kode_jadwal');
  const nomorUrutTagihanWatch = form.watch('nomor_urut_tagihan');
  const namaSkpdWatch = form.watch('nama_skpd');

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
        uraian: editingTagihan.uraian,
        jumlah_kotor: editingTagihan.jumlah_kotor,
        jenis_spm: editingTagihan.jenis_spm,
        jenis_tagihan: editingTagihan.jenis_tagihan,
        status_tagihan: editingTagihan.status_tagihan as EditTagihanFormValues['status_tagihan'],
        kode_jadwal: editingTagihan.kode_jadwal || '',
        nomor_urut_tagihan: editingTagihan.nomor_urut || 1,
        sumber_dana: editingTagihan.sumber_dana || '',
      });
    } else if (isOpen && !editingTagihan) {
      form.reset();
    }
  }, [isOpen, editingTagihan, form]);

  const isNomorSpmDuplicate = useCallback(async (
    nomorUrutToCheck: number,
    namaSkpd: string,
    kodeJadwal: string,
    currentYear: string,
    excludeTagihanId: string | null = null
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

  const handleTransferVerifikator = async () => {
    if (!editingTagihan || !selectedVerifier) {
      toast.error('Pilih verifikator tujuan terlebih dahulu');
      return;
    }

    try {
      const selectedVerifierData = verifierOptions.find(v => v.value === selectedVerifier);

      if (!selectedVerifierData) {
        toast.error('Verifikator tidak ditemukan');
        return;
      }

      const { error } = await supabase
        .from('database_tagihan')
        .update({
          nama_verifikator: selectedVerifierData.label,
          locked_by: null,
          locked_at: null,
        })
        .eq('id_tagihan', editingTagihan.id_tagihan);

      if (error) throw error;

      toast.success(`Tagihan berhasil dipindahkan ke ${selectedVerifierData.label}`);
      setSelectedVerifier('');
      onTagihanUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error transferring tagihan:', error.message);
      toast.error('Gagal memindahkan tagihan: ' + error.message);
    }
  };

  const onSubmit = async (values: EditTagihanFormValues) => {
    if (!editingTagihan) return;

    setIsSubmitting(true);
    try {
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
          editingTagihan.id_tagihan
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
          nomor_spm: newNomorSpm,
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          status_tagihan: values.status_tagihan,
          kode_jadwal: values.kode_jadwal,
          nomor_urut: values.nomor_urut_tagihan,
          sumber_dana: values.sumber_dana,
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

  const showTransferTab = editingTagihan?.status_tagihan === 'Menunggu Verifikasi' && editingTagihan?.nomor_verifikasi;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 -m-6 mb-0 p-6 rounded-t-lg">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            Edit Tagihan
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Kelola data tagihan atau transfer tugas verifikasi
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1">
            <TabsTrigger
              value="data"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Data Tagihan
            </TabsTrigger>
            <TabsTrigger
              value="transfer"
              disabled={!showTransferTab}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Transfer Verifikator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="mt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nama_skpd" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nama SKPD
                </Label>
                <Input
                  id="nama_skpd"
                  {...form.register('nama_skpd')}
                  className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isSubmitting}
                />
                {form.formState.errors.nama_skpd && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.nama_skpd.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomor_spm_otomatis" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nomor SPM (Otomatis)
                </Label>
                <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 border-2 border-emerald-200 dark:border-emerald-800">
                  <p className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {generatedNomorSpmPreview || 'Membuat Nomor SPM...'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomor_urut_tagihan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nomor Urut Tagihan
                  </Label>
                  <Input
                    id="nomor_urut_tagihan"
                    type="number"
                    {...form.register('nomor_urut_tagihan', { valueAsNumber: true })}
                    className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.nomor_urut_tagihan && (
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.nomor_urut_tagihan.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kode_jadwal" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jadwal Penganggaran
                  </Label>
                  <Controller
                    name="kode_jadwal"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="border-slate-300 dark:border-slate-700">
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
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.kode_jadwal.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jenis_spm" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jenis SPM
                  </Label>
                  <Controller
                    name="jenis_spm"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="border-slate-300 dark:border-slate-700">
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
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.jenis_spm.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jenis_tagihan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jenis Tagihan
                  </Label>
                  <Controller
                    name="jenis_tagihan"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="border-slate-300 dark:border-slate-700">
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
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.jenis_tagihan.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sumber_dana" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Sumber Dana
                </Label>
                <Controller
                  name="sumber_dana"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <SelectTrigger className="border-slate-300 dark:border-slate-700">
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
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.sumber_dana.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="uraian" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Uraian
                </Label>
                <Textarea
                  id="uraian"
                  {...form.register('uraian')}
                  className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                  rows={3}
                  disabled={isSubmitting}
                />
                {form.formState.errors.uraian && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.uraian.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jumlah_kotor" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Jumlah Kotor
                  </Label>
                  <Input
                    id="jumlah_kotor"
                    type="number"
                    {...form.register('jumlah_kotor')}
                    className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                    disabled={isSubmitting}
                  />
                  {form.formState.errors.jumlah_kotor && (
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.jumlah_kotor.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_tagihan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Status Tagihan
                  </Label>
                  <Controller
                    name="status_tagihan"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger className="border-slate-300 dark:border-slate-700">
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
                    <p className="text-red-500 text-sm">
                      {form.formState.errors.status_tagihan.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="transfer" className="mt-6">
            {showTransferTab ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Verifikator Saat Ini</Label>
                  <Input
                    value={editingTagihan.nama_verifikator || '-'}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-verifier" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pindahkan ke Verifikator Baru</Label>
                  <Combobox
                    options={verifierOptions}
                    value={selectedVerifier}
                    onValueChange={setSelectedVerifier}
                    placeholder="Pilih Staf Verifikator"
                    className="w-full border-slate-300 dark:border-slate-700"
                  />
                </div>

                <Button
                  onClick={(e) => { e.preventDefault(); handleTransferVerifikator(); }}
                  disabled={!selectedVerifier || selectedVerifier === editingTagihan.nama_verifikator}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Transfer Tagihan
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                Fitur transfer hanya tersedia untuk tagihan yang sedang menunggu verifikasi.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditTagihanDialog;