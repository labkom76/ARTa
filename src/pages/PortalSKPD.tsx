import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircleIcon, SearchIcon, EditIcon, Trash2Icon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import TagihanDetailDialog from '@/components/TagihanDetailDialog'; // Import the new detail dialog
import { format } from 'date-fns'; // Import format from date-fns

// Zod schema for form validation
const formSchema = z.object({
  uraian: z.string().min(1, { message: 'Uraian wajib diisi.' }),
  jumlah_kotor: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: 'Jumlah Kotor harus angka positif.' })
  ),
  jenis_spm: z.string().min(1, { message: 'Jenis SPM wajib dipilih.' }),
  jenis_tagihan: z.string().min(1, { message: 'Jenis Tagihan wajib dipilih.' }),
  kode_jadwal: z.string().min(1, { message: 'Kode Jadwal Penganggaran wajib dipilih.' }), // New field
  nomor_urut_tagihan: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: 'Nomor Urut Tagihan wajib diisi dan harus angka positif.' })
  ),
});

type TagihanFormValues = z.infer<typeof formSchema>;

interface VerificationItem {
  item: string;
  memenuhi_syarat: boolean;
  keterangan: string;
}

interface ScheduleOption {
  id: string;
  kode_jadwal: string;
  deskripsi_jadwal: string;
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
  nama_verifikator?: string;
  waktu_verifikasi?: string;
  detail_verifikasi?: VerificationItem[];
  nomor_verifikasi?: string;
  nama_registrator?: string;
  kode_jadwal?: string; // Add kode_jadwal to Tagihan interface
}

// --- FUNGSI BARU: isNomorSpmDuplicate ---
const isNomorSpmDuplicate = async (nomorSpmToCheck: string): Promise<boolean> => {
  try {
    const { count, error } = await supabase
      .from('database_tagihan')
      .select('id_tagihan', { count: 'exact', head: true })
      .eq('nomor_spm', nomorSpmToCheck);

    if (error) {
      console.error('Error checking for duplicate SPM:', error.message);
      throw error;
    }

    return (count || 0) > 0;
  } catch (error: any) {
    console.error('Exception in isNomorSpmDuplicate:', error.message);
    // Re-throw or handle as appropriate, for now, assume no duplicate on error
    return false; 
  }
};
// --- AKHIR FUNGSI BARU ---

const PortalSKPD = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagihanToDelete, setTagihanToDelete] = useState<{ id: string; nomorSpm: string } | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  const [isAccountVerified, setIsAccountVerified] = useState(true);
  const toastShownRef = useRef(false);

  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]); // State for schedule options
  const [kodeWilayah, setKodeWilayah] = useState<string | null>(null); // State for kode_wilayah
  const [kodeSkpd, setKodeSkpd] = useState<string | null>(null); // New state for kode_skpd
  const [generatedNomorSpm, setGeneratedNomorSpm] = useState<string | null>(null); // State for generated Nomor SPM
  const [isSubmitting, setIsSubmitting] = useState(false); // Deklarasi state isSubmitting yang hilang

  const form = useForm<TagihanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uraian: '',
      jumlah_kotor: 0,
      jenis_spm: '',
      jenis_tagihan: '',
      kode_jadwal: '', // Default value for new field
      nomor_urut_tagihan: 1, // Default value for new field
    },
  });

  // Watch for changes in form fields that affect SPM generation
  const jenisTagihanWatch = form.watch('jenis_tagihan');
  const kodeJadwalWatch = form.watch('kode_jadwal');
  const nomorUrutTagihanWatch = form.watch('nomor_urut_tagihan');

  useEffect(() => {
    if (!sessionLoading && profile) {
      if (profile.peran === 'SKPD' && !profile.asal_skpd) {
        setIsAccountVerified(false);
        if (!toastShownRef.current) {
          toast.error('Akun belum diverifikasi. Silakan hubungi admin untuk melanjutkan.');
          toastShownRef.current = true;
        }
      } else {
        setIsAccountVerified(true);
        toastShownRef.current = false; // Reset if account becomes verified
      }
    }
  }, [sessionLoading, profile]);

  // Fetch Kode Wilayah from app_settings
  useEffect(() => {
    const fetchAppSetting = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'kode_wilayah')
        .single();
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching kode_wilayah:', error.message);
        toast.error('Gagal memuat Kode Wilayah.');
      } else if (data) {
        setKodeWilayah(data.value);
      }
    };
    fetchAppSetting();
  }, []);

  // Fetch Kode SKPD for the logged-in user's SKPD
  useEffect(() => {
    const fetchKodeSkpd = async () => {
      if (profile?.asal_skpd) {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('kode_skpd')
          .eq('nama_skpd', profile.asal_skpd)
          .single();
        if (error) {
          console.error('Error fetching kode_skpd:', error.message);
          toast.error('Gagal memuat Kode SKPD Anda.');
          setKodeSkpd(null);
        } else if (data) {
          setKodeSkpd(data.kode_skpd);
        }
      } else {
        setKodeSkpd(null);
      }
    };
    fetchKodeSkpd();
  }, [profile?.asal_skpd]);

  // Fetch Schedule Options
  useEffect(() => {
    const fetchScheduleOptions = async () => {
      const { data, error } = await supabase
        .from('master_jadwal')
        .select('id, kode_jadwal, deskripsi_jadwal')
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

  // Helper function to extract the code from Jenis Tagihan full description
  const getJenisTagihanCode = (fullDescription: string): string => {
    const match = fullDescription.match(/\(([^)]+)\)/);
    return match ? match[1] : fullDescription; // Fallback to full description if no code found
  };

  // Function to generate Nomor SPM
  const generateNomorSpm = useCallback(async (
    jenisTagihanFull: string,
    kodeJadwal: string,
    currentKodeSkpd: string | null,
    currentKodeWilayah: string | null,
    nomorUrutTagihan: number | null | undefined
  ) => {
    if (!jenisTagihanFull || !kodeJadwal || !currentKodeSkpd || !currentKodeWilayah || nomorUrutTagihan === null || nomorUrutTagihan === undefined) {
      return null;
    }

    const jenisTagihanCode = getJenisTagihanCode(jenisTagihanFull);

    const now = new Date();
    const currentMonth = format(now, 'MM');
    const currentYear = format(now, 'yyyy');

    const formattedSequence = String(nomorUrutTagihan).padStart(6, '0'); // Pad with 6 zeros

    // Final SPM string construction
    return `${currentKodeWilayah}/${formattedSequence}/${jenisTagihanCode}/${currentKodeSkpd}/${kodeJadwal}/${currentMonth}/${currentYear}`;
  }, []);

  // Effect to trigger SPM number generation
  useEffect(() => {
    const updateNomorSpm = async () => {
      if (jenisTagihanWatch && kodeJadwalWatch && kodeSkpd && kodeWilayah && nomorUrutTagihanWatch !== null && nomorUrutTagihanWatch !== undefined) {
        const newNomorSpm = await generateNomorSpm(jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch);
        setGeneratedNomorSpm(newNomorSpm);
      } else {
        setGeneratedNomorSpm(null);
      }
    };
    updateNomorSpm();
  }, [jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch, generateNomorSpm]);

  const fetchTagihan = async () => {
    if (!user || sessionLoading) return;

    setLoading(true);
    try {
      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' }) // Select all columns for detail view
        .eq('id_pengguna_input', user.id);

      if (searchQuery) {
        query = query.ilike('nomor_spm', `%${searchQuery}%`);
      }

      query = query.order('waktu_input', { ascending: false });

      if (itemsPerPage !== -1) {
        query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setTagihanList(data as Tagihan[]);
      setTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error fetching tagihan:', error.message);
      toast.error('Gagal memuat daftar tagihan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, [user, sessionLoading, searchQuery, currentPage, itemsPerPage]);

  useEffect(() => {
    if (isModalOpen) { // Only reset when modal opens
      if (editingTagihan) {
        // Extract sequence number from existing nomor_spm
        const spmParts = editingTagihan.nomor_spm.split('/');
        const extractedNomorUrut = spmParts.length > 1 ? parseInt(spmParts[1], 10) : 1;

        form.reset({
          uraian: editingTagihan.uraian,
          jumlah_kotor: editingTagihan.jumlah_kotor,
          jenis_spm: editingTagihan.jenis_spm,
          jenis_tagihan: editingTagihan.jenis_tagihan,
          kode_jadwal: editingTagihan.kode_jadwal || '',
          nomor_urut_tagihan: extractedNomorUrut,
        });
      } else {
        form.reset({
          uraian: '',
          jumlah_kotor: 0,
          jenis_spm: '',
          jenis_tagihan: '',
          kode_jadwal: '',
          nomor_urut_tagihan: 1, // Default for new tagihan
        });
      }
    }
  }, [isModalOpen, editingTagihan, form]);

  const onSubmit = async (values: TagihanFormValues) => {
    if (!user || !profile) {
      toast.error('Anda harus login untuk membuat/mengedit tagihan.');
      return;
    }
    if (!isAccountVerified) {
      toast.error('Akun Anda belum diverifikasi. Tidak dapat menginput tagihan.');
      return;
    }

    setIsSubmitting(true); // Set submitting state to true
    try {
      if (editingTagihan) {
        const { error } = await supabase
          .from('database_tagihan')
          .update({
            uraian: values.uraian,
            jumlah_kotor: values.jumlah_kotor,
            jenis_spm: values.jenis_spm,
            jenis_tagihan: values.jenis_tagihan,
            kode_jadwal: values.kode_jadwal, // Update kode_jadwal
          })
          .eq('id_tagihan', editingTagihan.id_tagihan)
          .eq('id_pengguna_input', user.id);

        if (error) throw error;
        toast.success('Tagihan berhasil diperbarui!');
      } else {
        if (!generatedNomorSpm) {
          toast.error('Gagal membuat Nomor SPM otomatis. Harap coba lagi.');
          setIsSubmitting(false); // Reset submitting state on error
          return;
        }

        // --- START VALIDASI DUPLIKAT NOMOR SPM ---
        const isDuplicate = await isNomorSpmDuplicate(generatedNomorSpm);

        if (isDuplicate) {
          toast.error('Nomor Urut Tagihan ini sudah digunakan. Silakan gunakan nomor lain.');
          setIsSubmitting(false); // Ensure submitting state is reset
          return; // Stop the submission process
        }
        // --- END VALIDASI DUPLIKAT NOMOR SPM ---

        const { error } = await supabase.from('database_tagihan').insert({
          id_pengguna_input: user.id,
          nama_skpd: profile.asal_skpd,
          nomor_spm: generatedNomorSpm, // Insert generated Nomor SPM
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          kode_jadwal: values.kode_jadwal, // Insert kode_jadwal
          status_tagihan: 'Menunggu Registrasi',
        });

        if (error) throw error;
        toast.success('Tagihan baru berhasil disimpan!');
      }

      form.reset();
      setIsModalOpen(false);
      setEditingTagihan(null);
      fetchTagihan();
    } catch (error: any) {
      console.error('Error saving tagihan:', error.message);
      toast.error('Gagal menyimpan tagihan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (tagihan: Tagihan) => {
    if (!isAccountVerified) {
      toast.error('Akun Anda belum diverifikasi. Tidak dapat mengedit tagihan.');
      return;
    }
    setEditingTagihan(tagihan);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tagihanId: string, nomorSpm: string) => {
    if (!isAccountVerified) {
      toast.error('Akun Anda belum diverifikasi. Tidak dapat menghapus tagihan.');
      return;
    }
    setTagihanToDelete({ id: tagihanId, nomorSpm: nomorSpm });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!tagihanToDelete || !user) {
      toast.error('Terjadi kesalahan saat menghapus tagihan.');
      return;
    }

    try {
      const { error } = await supabase
        .from('database_tagihan')
        .delete()
        .eq('id_tagihan', tagihanToDelete.id)
        .eq('id_pengguna_input', user.id);

      if (error) throw error;

      toast.success('Tagihan berhasil dihapus!');
      fetchTagihan();
    } catch (error: any) {
error('Error deleting tagihan:', error.message);
      toast.error('Gagal menghapus tagihan: ' + error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setTagihanToDelete(null);
    }
  };

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Portal SKPD</h1>
        <Button onClick={() => { setEditingTagihan(null); setIsModalOpen(true); }} className="flex items-center gap-2" disabled={!isAccountVerified}>
          <PlusCircleIcon className="h-4 w-4" /> Input Tagihan Baru
        </Button>
      </div>

      <div className="mb-4 flex items-center space-x-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="text"
            placeholder="Cari berdasarkan Nomor SPM..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Per halaman:</Label>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="-1">Semua</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-400">Memuat tagihan...</p>
      ) : tagihanList.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan ditemukan.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor SPM</TableHead>
                  <TableHead>Jenis SPM</TableHead>
                  <TableHead>Jenis Tagihan</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead>Jumlah Kotor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagihanList.map((tagihan) => (
                  <TableRow key={tagihan.id_tagihan}>
                    <TableCell className="font-medium">{tagihan.nomor_spm}</TableCell>
                    <TableCell>{tagihan.jenis_spm}</TableCell>
                    <TableCell>{tagihan.jenis_tagihan}</TableCell>
                    <TableCell>{tagihan.uraian}</TableCell>
                    <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                    <TableCell>{tagihan.status_tagihan}</TableCell>
                    <TableCell className="text-center">
                      {tagihan.status_tagihan === 'Menunggu Registrasi' ? (
                        <div className="flex justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(tagihan)}
                            title="Edit Tagihan"
                            disabled={!isAccountVerified}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteClick(tagihan.id_tagihan, tagihan.nomor_spm)}
                            title="Hapus Tagihan"
                            disabled={!isAccountVerified}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleDetailClick(tagihan)}>
                          Detail
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || itemsPerPage === -1}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      isActive={currentPage === index + 1}
                      onClick={() => setCurrentPage(index + 1)}
                      disabled={itemsPerPage === -1}
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || itemsPerPage === -1}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingTagihan(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTagihan ? 'Edit Tagihan' : 'Input Tagihan Baru'}</DialogTitle>
            <DialogDescription>
              {editingTagihan ? 'Perbarui detail tagihan Anda.' : 'Masukkan detail tagihan baru Anda di sini.'} Klik simpan setelah selesai.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* Pratinjau Nomor SPM Otomatis */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nomor_spm_otomatis" className="text-right">
                Nomor SPM (Otomatis)
              </Label>
              <Input
                id="nomor_spm_otomatis"
                value={generatedNomorSpm || 'Membuat Nomor SPM...'}
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
                disabled={!isAccountVerified || !!editingTagihan} // Disable if editing or not verified
              />
              {form.formState.errors.nomor_urut_tagihan && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.nomor_urut_tagihan.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jenis_spm" className="text-right">
                Jenis SPM
              </Label>
              <Select onValueChange={(value) => form.setValue('jenis_spm', value)} value={form.watch('jenis_spm')} disabled={!isAccountVerified}>
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
              <Select onValueChange={(value) => form.setValue('jenis_tagihan', value)} value={form.watch('jenis_tagihan')} disabled={!isAccountVerified}>
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
              {form.formState.errors.jenis_tagihan && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jenis_tagihan.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kode_jadwal" className="text-right">
                Jadwal Penganggaran
              </Label>
              <Select onValueChange={(value) => form.setValue('kode_jadwal', value)} value={form.watch('kode_jadwal')} disabled={!isAccountVerified}>
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
              {form.formState.errors.kode_jadwal && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.kode_jadwal.message}
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
                disabled={!isAccountVerified}
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
                disabled={!isAccountVerified}
              />
              {form.formState.errors.jumlah_kotor && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jumlah_kotor.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !isAccountVerified}>
                {isSubmitting ? (editingTagihan ? 'Memperbarui...' : 'Menyimpan...') : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan"
        message={`Apakah Anda yakin ingin menghapus tagihan dengan Nomor SPM: ${tagihanToDelete?.nomorSpm}? Tindakan ini tidak dapat diurungkan.`}
      />

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />
    </div>
  );
};

export default PortalSKPD;