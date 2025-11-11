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
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircleIcon, SearchIcon, EditIcon, Trash2Icon, FileDownIcon, ArrowUp, ArrowDown, FilePenLine, EyeIcon } from 'lucide-react'; // Import FileDownIcon, ArrowUp, ArrowDown, FilePenLine, EyeIcon
import { Textarea } from '@/components/ui/textarea';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import TagihanDetailDialog from '@/components/TagihanDetailDialog'; // Import the new detail dialog
import { format, differenceInDays, parseISO } from 'date-fns'; // Import format, differenceInDays, parseISO
import { id as localeId } from 'date-fns/locale'; // Import locale for Indonesian date formatting, renamed to localeId
import { generateNomorSpm, getJenisTagihanCode } from '@/utils/spmGenerator'; // Import utility functions
import StatusBadge from '@/components/StatusBadge'; // Import StatusBadge
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider, // Import TooltipProvider
} from "@/components/ui/tooltip"; // Import Tooltip components
import { useLocation, useNavigate } from 'react-router-dom'; // Import useLocation and useNavigate
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import * as XLSX from 'xlsx'; // Import XLSX library
import Countdown from 'react-countdown'; // Import Countdown

// Zod schema for form validation
const formSchema = z.object({
  uraian: z.string().min(1, { message: 'Uraian wajib diisi.' }).max(250, { message: 'Uraian tidak boleh lebih dari 250 karakter.' }),
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
  sumber_dana: z.string().min(1, { message: 'Sumber Dana wajib dipilih.' }), // New field for Sumber Dana
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
  nomor_urut?: number; // Add nomor_urut to Tagihan interface
  sumber_dana?: string; // Add sumber_dana to Tagihan interface
  catatan_registrasi?: string; // NEW: Add catatan_registrasi
  skpd_can_edit?: boolean; // NEW: Add skpd_can_edit
  tenggat_perbaikan?: string; // Add tenggat_perbaikan
}

// --- FUNGSI BARU: isNomorSpmDuplicate (MODIFIED) ---
const isNomorSpmDuplicate = async (
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
      .like('nomor_spm', `%/${currentYear}`); // Filter by year from SPM string

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
};
// --- AKHIR FUNGSI BARU ---

const PortalSKPD = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false); // New state for pagination loading
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status'); // New state for status filter

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagihanToDelete, setTagihanToDelete] = useState<{ id: string; nomorSpm: string } | null>(null);

  const [isDetailModalOpen, setIsDetailModal] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  const [isAccountVerified, setIsAccountVerified] = useState(true);
  const toastShownRef = useRef(false);

  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]); // State for schedule options
  const [kodeWilayah, setKodeWilayah] = useState<string | null>(null); // State for kode_wilayah
  const [kodeSkpd, setKodeSkpd] = useState<string | null>(null); // New state for kode_skpd
  const [generatedNomorSpm, setGeneratedNomorSpm] = useState<string | null>(null); // State for generated Nomor SPM
  const [isSubmitting, setIsSubmitting] = useState(false); // Deklarasi state isSubmitting yang hilang

  // NEW: State for sorting
  const [sortColumn, setSortColumn] = useState<string>('nomor_urut');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const location = useLocation(); // Initialize useLocation

  const form = useForm<TagihanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uraian: '',
      jumlah_kotor: 0,
      jenis_spm: '',
            jenis_tagihan: '',
      kode_jadwal: '', // Default value for new field
      nomor_urut_tagihan: 1, // Default value for new field
      sumber_dana: '', // Default value for new field
    },
  });

  // Watch for changes in form fields that affect SPM generation
  const jenisTagihanWatch = form.watch('jenis_tagihan');
  const kodeJadwalWatch = form.watch('kode_jadwal');
  const nomorUrutTagihanWatch = form.watch('nomor_urut_tagihan');
  const uraianWatch = form.watch('uraian'); // Watch uraian for character count

  useEffect(() => {
    if (!sessionLoading && profile) {
      // MODIFIED: Check both asal_skpd and is_active
      if (profile.peran === 'SKPD' && (!profile.asal_skpd || !profile.is_active)) {
        setIsAccountVerified(false);
        if (!toastShownRef.current) {
          toast.error('Akun Anda belum diverifikasi atau diblokir. Silakan hubungi admin untuk melanjutkan.');
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
    if (profile?.asal_skpd) {
      const fetchKodeSkpd = async () => {
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
      };
      fetchKodeSkpd(); // Corrected: Call fetchKodeSkpd() instead of fetchSkpd()
    } else {
      setKodeSkpd(null);
    }
  }, [profile?.asal_skpd]);

  // Fetch Schedule Options - MODIFIED TO FILTER BY is_active
  useEffect(() => {
    const fetchScheduleOptions = async () => {
      const { data, error } = await supabase
        .from('master_jadwal')
        .select('id, kode_jadwal, deskripsi_jadwal')
        .eq('is_active', true) // ONLY FETCH ACTIVE SCHEDULES
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

  // Function to generate Nomor SPM
  const generateNomorSpmCallback = useCallback(async (
    jenisTagihanFull: string,
    kodeJadwal: string,
    currentKodeSkpd: string | null,
    currentKodeWilayah: string | null,
    nomorUrutTagihan: number | null | undefined
  ) => {
    if (!jenisTagihanFull || !kodeJadwal || !currentKodeSkpd || !currentKodeWilayah || nomorUrutTagihan === null || nomorUrutTagihan === undefined) {
      return null;
    }
    return generateNomorSpm(jenisTagihanFull, kodeJadwal, currentKodeSkpd, currentKodeWilayah, nomorUrutTagihan);
  }, []);

  // Effect to trigger SPM number generation
  useEffect(() => {
    const updateNomorSpm = async () => {
      if (jenisTagihanWatch && kodeJadwalWatch && kodeSkpd && kodeWilayah && nomorUrutTagihanWatch !== null && nomorUrutTagihanWatch !== undefined) {
        const newNomorSpm = await generateNomorSpmCallback(jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch);
        setGeneratedNomorSpm(newNomorSpm);
      } else {
        setGeneratedNomorSpm(null);
      }
    };
    updateNomorSpm();
  }, [jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch, generateNomorSpmCallback]);

  // Ref to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevSelectedStatus = useRef(selectedStatus);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);
  const prevSortColumn = useRef(sortColumn); // New ref for sortColumn
  const prevSortDirection = useRef(sortDirection); // New ref for sortDirection

  const fetchTagihan = async (isPaginationOnlyChange = false) => {
    if (!user || sessionLoading) return;

    if (!isPaginationOnlyChange) {
      setLoading(true); // Show full loading spinner for search/filter changes
    } else {
      setLoadingPagination(true); // Only disable pagination buttons for page changes
    }

    try {
      let query = supabase
        .from('database_tagihan')
        .select('*, skpd_can_edit, tenggat_perbaikan, waktu_verifikasi', { count: 'exact' }) // Select all columns for detail view, including skpd_can_edit and tenggat_perbaikan
        .eq('id_pengguna_input', user.id);

      if (searchQuery) {
        query = query.ilike('nomor_spm', `%${searchQuery}%`);
      }

      // Apply status filter if not 'Semua Status'
      if (selectedStatus !== 'Semua Status') {
        query = query.eq('status_tagihan', selectedStatus);
      }

      // MODIFIED: Apply dynamic sorting based on state
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });

      if (itemsPerPage !== -1) {
        query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Supabase query error:', error); // Log full error object
        throw error;
      }

      setTagihanList(data as Tagihan[]);
      setTotalItems(count || 0); // Ensure count is used here

    } catch (error: any) {
      console.error('Error fetching tagihan:', error.message);
      toast.error('Gagal memuat daftar tagihan: ' + error.message);
    } finally {
      if (!isPaginationOnlyChange) {
        setLoading(false);
      } else {
        setLoadingPagination(false);
      }
    }
  };

  // Effect untuk membaca query parameter status dari URL saat komponen pertama kali dimuat
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    if (statusParam) {
      setSelectedStatus(statusParam);
      setCurrentPage(1); // Reset page when status changes from URL
    } else {
      setSelectedStatus('Semua Status');
      setCurrentPage(1);
    }
  }, [location.search]);

  // Main useEffect to trigger data fetching
  useEffect(() => {
    let isPaginationOnlyChange = false;
    // Check if only currentPage changed, while other filters/search/itemsPerPage remained the same
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === searchQuery &&
      prevSelectedStatus.current === selectedStatus &&
      prevItemsPerPage.current === itemsPerPage &&
      prevSortColumn.current === sortColumn && // Include sortColumn
      prevSortDirection.current === sortDirection // Include sortDirection
    ) {
      isPaginationOnlyChange = true;
    }

    fetchTagihan(isPaginationOnlyChange);

    // Update refs for the next render cycle
    prevSearchQuery.current = searchQuery;
    prevSelectedStatus.current = selectedStatus;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;
    prevSortColumn.current = sortColumn; // Update sortColumn ref
    prevSortDirection.current = sortDirection; // Update sortDirection ref

  }, [user, sessionLoading, searchQuery, selectedStatus, currentPage, itemsPerPage, sortColumn, sortDirection]); // Dependencies for this effect

  useEffect(() => {
    if (isModalOpen) { // Only reset when modal opens
      if (editingTagihan) {
        form.reset({
          uraian: editingTagihan.uraian,
          jumlah_kotor: editingTagihan.jumlah_kotor,
          jenis_spm: editingTagihan.jenis_spm,
          jenis_tagihan: editingTagihan.jenis_tagihan,
          kode_jadwal: editingTagihan.kode_jadwal || '',
          nomor_urut_tagihan: editingTagihan.nomor_urut || 1, // Menggunakan nomor_urut langsung
          sumber_dana: editingTagihan.sumber_dana || '', // Set sumber_dana for editing
        });
      } else {
        form.reset({
          uraian: '',
          jumlah_kotor: 0,
          jenis_spm: '',
          jenis_tagihan: '',
          kode_jadwal: '',
          nomor_urut_tagihan: 1, // Default for new tagihan
          sumber_dana: '', // Default for new tagihan
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
      toast.error('Akun Anda belum diverifikasi atau diblokir. Tidak dapat menginput tagihan.');
      return;
    }

    setIsSubmitting(true); // Set submitting state to true
    try {
      // Ensure kodeSkpd and kodeWilayah are available for SPM generation
      if (!kodeSkpd || !kodeWilayah) {
        toast.error('Kode SKPD atau Kode Wilayah tidak tersedia. Gagal memperbarui Nomor SPM.');
        setIsSubmitting(false);
        return;
      }

      // Regenerate Nomor SPM based on current form values
      const newNomorSpm = await generateNomorSpmCallback(
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
        (editingTagihan && values.nomor_urut_tagihan !== editingTagihan.nomor_urut) ||
        (editingTagihan && values.kode_jadwal !== editingTagihan.kode_jadwal);
      
      if (hasRelevantFieldsChanged || !editingTagihan) { // Always check for new tagihan
        const isDuplicate = await isNomorSpmDuplicate(
          values.nomor_urut_tagihan,
          profile.asal_skpd,
          values.kode_jadwal,
          currentYear,
          editingTagihan?.id_tagihan // Exclude current tagihan from duplicate check if editing
        );

        if (isDuplicate) {
          toast.error('Nomor Urut Tagihan ini sudah digunakan untuk SKPD dan Jadwal yang sama di tahun ini. Silakan gunakan nomor lain.');
          setIsSubmitting(false); // Ensure submitting state is reset
          return; // Stop the submission process
        }
      }

      if (editingTagihan) {
        const updateObject: any = {
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          kode_jadwal: values.kode_jadwal,
          nomor_urut: values.nomor_urut_tagihan,
          nomor_spm: newNomorSpm,
          sumber_dana: values.sumber_dana,
          catatan_registrasi: null, // Clear any previous review notes
        };

        // Preserve the original status if it was 'Dikembalikan'
        // Otherwise, if it was 'Tinjau Kembali' or 'Menunggu Registrasi', set it to 'Menunggu Registrasi'
        if (editingTagihan.status_tagihan === 'Dikembalikan') {
          updateObject.status_tagihan = 'Dikembalikan';
          updateObject.skpd_can_edit = editingTagihan.skpd_can_edit; // Preserve original skpd_can_edit
          updateObject.tenggat_perbaikan = editingTagihan.tenggat_perbaikan; // Preserve original tenggat_perbaikan
        } else {
          updateObject.status_tagihan = 'Menunggu Registrasi';
          updateObject.skpd_can_edit = false; // Default for new or non-Dikembalikan statuses
          updateObject.tenggat_perbaikan = null; // Clear tenggat_perbaikan for non-Dikembalikan statuses
        }

        const { data, error } = await supabase
          .from('database_tagihan')
          .update(updateObject) // Use the constructed updateObject
          .eq('id_tagihan', editingTagihan.id_tagihan)
          .eq('id_pengguna_input', user.id)
          .select(); // IMPORTANT: Added .select() to get affected rows

        if (error) {
          console.error('Supabase update error:', error);
          toast.error('Gagal memperbarui tagihan: ' + error.message);
          setIsSubmitting(false);
          return; // Stop execution if there's an error
        }

        // NEW: Check if any rows were actually updated
        if (!data || data.length === 0) {
          console.warn('Supabase update warning: No rows affected. Possible RLS issue or record not found/editable.');
          toast.error('Gagal memperbarui tagihan: Tidak ada perubahan yang disimpan. Pastikan Anda memiliki izin untuk mengedit tagihan ini.');
          setIsSubmitting(false);
          return;
        }

        // NEW: Send notification to Registration Staff
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: 'staf_registrasi_id_placeholder', // Placeholder: Replace with actual Registration Staff ID(s)
            message: `Tagihan SPM ${newNomorSpm} dari SKPD ${profile.asal_skpd} telah diperbarui dan siap diregistrasi ulang.`,
            is_read: false,
            tagihan_id: editingTagihan.id_tagihan,
          });

        if (notificationError) {
          console.error('Error inserting notification for Registration Staff:', notificationError.message);
        }

        toast.success('Tagihan berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('database_tagihan').insert({
          id_pengguna_input: user.id,
          nama_skpd: profile.asal_skpd,
          nomor_spm: newNomorSpm, // Insert generated Nomor SPM
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          kode_jadwal: values.kode_jadwal, // Insert kode_jadwal
          nomor_urut: values.nomor_urut_tagihan, // Insert nomor_urut
          sumber_dana: values.sumber_dana, // Insert sumber_dana
          status_tagihan: 'Menunggu Registrasi',
        });

        if (error) {
          console.error('Supabase insert error:', error);
          toast.error('Gagal menyimpan tagihan: ' + error.message);
          setIsSubmitting(false);
          return; // Stop execution if there's an error
        }
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
      toast.error('Akun Anda belum diverifikasi atau diblokir. Tidak dapat mengedit tagihan.');
      return;
    }
    setEditingTagihan(tagihan);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (tagihanId: string, nomorSpm: string) => {
    if (!isAccountVerified) {
      toast.error('Akun Anda belum diverifikasi atau diblokir. Tidak dapat menghapus tagihan.');
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
      console.error('Error deleting tagihan:', error.message);
      toast.error('Gagal menghapus tagihan: ' + error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setTagihanToDelete(null);
    }
  };

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModal(true);
  };

  const handleExportToXLSX = () => {
    if (tagihanList.length === 0) {
      toast.info('Tidak ada data tagihan untuk diekspor.');
      return;
    }

    // Create a copy of tagihanList and sort it by nomor_urut ascending
    const sortedTagihanList = [...tagihanList].sort((a, b) => {
      const nomorUrutA = a.nomor_urut ?? 0; // Handle undefined/null nomor_urut
      const nomorUrutB = b.nomor_urut ?? 0;
      return nomorUrutA - nomorUrutB; // Ascending order
    });

    const dataToExport = sortedTagihanList.map(tagihan => ({
      'Nomor SPM': tagihan.nomor_spm,
      'Nama SKPD': tagihan.nama_skpd,
      'Jenis SPM': tagihan.jenis_spm,
      'Jenis Tagihan': tagihan.jenis_tagihan,
      'Sumber Dana': tagihan.sumber_dana || '-',
      'Uraian': tagihan.uraian,
      'Jumlah Kotor': tagihan.jumlah_kotor,
      'Status Tagihan': tagihan.status_tagihan,
      'Waktu Input': format(new Date(tagihan.waktu_input), 'dd MMMM yyyy HH:mm', { locale: localeId }),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Tagihan SKPD");
    XLSX.writeFile(wb, "daftar_tagihan_skpd.xlsx");

    toast.success('Data tagihan berhasil diekspor ke XLSX!');
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  // Renderer for Countdown component
  const renderer = ({ days, hours, minutes, seconds, completed }: any) => {
    if (completed) {
      // Render a completed state
      return <span className="text-xs text-red-500">Waktu Habis!</span>;
    } else {
      // Render a countdown
      return (
        <span className="text-xs text-muted-foreground mt-1">
          Sisa waktu: {days > 0 && `${days} hari `}{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Portal SKPD</h1>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={handleExportToXLSX} disabled={!isAccountVerified || tagihanList.length === 0}>
            <FileDownIcon className="h-4 w-4" /> Export ke XLSX
          </Button>
          <Button onClick={() => { setEditingTagihan(null); setIsModalOpen(true); }} className="flex items-center gap-2" disabled={!isAccountVerified || !profile?.is_active}>
            <PlusCircleIcon className="h-4 w-4" /> Input Tagihan Baru
          </Button>
        </div>
      </div>

      {/* Card for Table (now includes filters) */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Tagihan</CardTitle>
          <p className="text-sm text-muted-foreground">Kelola dan input tagihan baru Anda di sini.</p>
        </CardHeader>
        <CardContent>
          {/* Filter controls moved here */}
          <div className="mb-4 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1 w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan Nomor SPM..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 w-full"
              />
            </div>
            <Select onValueChange={(value) => { setSelectedStatus(value); setCurrentPage(1); }} value={selectedStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter berdasarkan Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Status">Semua Status</SelectItem>
                <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                <SelectItem value="Tinjau Kembali">Tinjau Kembali</SelectItem> {/* NEW: Add Tinjau Kembali to filter */}
                <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
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

          {loading && !loadingPagination ? ( // Show full loading only if not pagination-only
            <p className="text-center text-gray-600 dark:text-gray-400">Memuat tagihan...</p>
          ) : tagihanList.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan ditemukan.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table key={`${selectedStatus}-${currentPage}`}>
                  <TableHeader>
                    <TableRow><TableHead className="w-[50px]">No.</TableHead><TableHead className="w-[180px]"> {/* MODIFIED: Set fixed width for Nomor SPM */}
                        <Button variant="ghost" onClick={() => handleSort('nomor_spm')} className="p-0 h-auto">
                          Nomor SPM
                          {sortColumn === 'nomor_spm' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead><TableHead>
                        <Button variant="ghost" onClick={() => handleSort('jenis_spm')} className="p-0 h-auto">
                          Jenis SPM
                          {sortColumn === 'jenis_spm' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead><TableHead>
                        <Button variant="ghost" onClick={() => handleSort('jenis_tagihan')} className="p-0 h-auto">
                          Jenis Tagihan
                          {sortColumn === 'jenis_tagihan' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead><TableHead>
                        <Button variant="ghost" onClick={() => handleSort('sumber_dana')} className="p-0 h-auto">
                          Sumber Dana
                          {sortColumn === 'sumber_dana' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead><TableHead>
                        <Button variant="ghost" onClick={() => handleSort('jumlah_kotor')} className="p-0 h-auto">
                          Jumlah Kotor
                          {sortColumn === 'jumlah_kotor' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead><TableHead>
                        <Button variant="ghost" onClick={() => handleSort('status_tagihan')} className="p-0 h-auto">
                          Status
                          {sortColumn === 'status_tagihan' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead><TableHead className="text-center w-[100px]">Aksi</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagihanList.map((tagihan, index) => {
                      // NEW: Conditional rendering for edit button
                      const canEdit = tagihan.status_tagihan === 'Menunggu Registrasi' ||
                                      tagihan.status_tagihan === 'Tinjau Kembali' ||
                                      (tagihan.status_tagihan === 'Dikembalikan' && tagihan.skpd_can_edit === true);

                      // Logic for countdown timer
                      const showCountdown = tagihan.status_tagihan === 'Dikembalikan' &&
                                            tagihan.tenggat_perbaikan &&
                                            tagihan.waktu_verifikasi &&
                                            differenceInDays(parseISO(tagihan.tenggat_perbaikan), parseISO(tagihan.waktu_verifikasi)) > 1;

                      return (
                        <TooltipProvider key={tagihan.id_tagihan + "-row-tooltip"}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TableRow>
                                <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                                <TableCell className="font-medium w-[180px] overflow-hidden"> {/* MODIFIED: Set fixed width and overflow */}
                                  <span className="block max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis">
                                    {tagihan.nomor_spm}
                                  </span>
                                </TableCell>
                                <TableCell>{tagihan.jenis_spm}</TableCell>
                                <TableCell>{tagihan.jenis_tagihan}</TableCell>
                                <TableCell>{tagihan.sumber_dana || '-'}</TableCell>
                                <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                                <TableCell>
                                  <StatusBadge status={tagihan.status_tagihan} />
                                  {showCountdown && (
                                    <Countdown date={new Date(tagihan.tenggat_perbaikan!)} renderer={renderer} />
                                  )}
                                </TableCell>
                                <TableCell className="text-center w-[100px]"> {/* MODIFIED: Set fixed width for Aksi */}
                                  <div className="flex justify-center space-x-2">
                                    {/* Always show Detail button for 'Dikembalikan' status */}
                                    {tagihan.status_tagihan === 'Dikembalikan' && (
                                      <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                                        <EyeIcon className="h-4 w-4" />
                                      </Button>
                                    )}

                                    {/* Show Edit button if canEdit is true */}
                                    {canEdit && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleEdit(tagihan)}
                                        title="Edit Tagihan"
                                        disabled={!isAccountVerified || !profile?.is_active}
                                      >
                                        <FilePenLine className="h-4 w-4" />
                                      </Button>
                                    )}

                                    {/* Show Delete button only for 'Menunggu Registrasi' */}
                                    {tagihan.status_tagihan === 'Menunggu Registrasi' && (
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteClick(tagihan.id_tagihan, tagihan.nomor_spm)}
                                        title="Hapus Tagihan"
                                        disabled={!isAccountVerified || !profile?.is_active}
                                      >
                                        <Trash2Icon className="h-4 w-4" />
                                      </Button>
                                    )}

                                    {/* If not editable AND not 'Dikembalikan', show only Detail button */}
                                    {!canEdit && tagihan.status_tagihan !== 'Dikembalikan' && (
                                      <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                                        <EyeIcon className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-md">Uraian: {tagihan.uraian}</p> {/* Display uraian here */}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-end space-x-4">
                <div className="text-sm text-muted-foreground">
                  Halaman {totalItems === 0 ? 0 : currentPage} dari {totalPages} ({totalItems} total item)
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || itemsPerPage === -1 || loadingPagination}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || itemsPerPage === -1 || loadingPagination}
                >
                  Berikutnya
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingTagihan(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTagihan ? 'Edit Tagihan' : 'Input Tagihan Baru'}</DialogTitle>
            <DialogDescription>
              {editingTagihan ? 'Perbarui detail tagihan Anda.' : 'Masukkan detail tagihan baru Anda di sini.'} Klik simpan setelah selesai.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* NEW: Display catatan_registrasi if status is 'Tinjau Kembali' */}
            {editingTagihan && editingTagihan.status_tagihan === 'Tinjau Kembali' && editingTagihan.catatan_registrasi && (
              <div className="grid gap-2 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-md mb-4">
                <Label className="text-red-700 dark:text-red-300 font-semibold">Catatan Peninjauan Kembali dari Staf Registrasi:</Label>
                <p className="text-sm text-red-600 dark:text-red-400">{editingTagihan.catatan_registrasi}</p>
              </div>
            )}

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
                Nomor Urut SPM
              </Label>
              <Input
                id="nomor_urut_tagihan"
                type="number"
                {...form.register('nomor_urut_tagihan', { valueAsNumber: true })}
                className="col-span-3"
                disabled={!isAccountVerified || !profile?.is_active} // MODIFIED: Removed || !!editingTagihan
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
              <Select onValueChange={(value) => form.setValue('kode_jadwal', value)} value={form.watch('kode_jadwal')} disabled={!isAccountVerified || !profile?.is_active}>
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
              <Label htmlFor="jenis_spm" className="text-right">
                Jenis SPM
              </Label>
              <Select onValueChange={(value) => form.setValue('jenis_spm', value)} value={form.watch('jenis_spm')} disabled={!isAccountVerified || !profile?.is_active}>
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
              <Select onValueChange={(value) => form.setValue('jenis_tagihan', value)} value={form.watch('jenis_tagihan')} disabled={!isAccountVerified || !profile?.is_active}>
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
            {/* New: Sumber Dana Dropdown */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sumber_dana" className="text-right">
                Sumber Dana
              </Label>
              <Select onValueChange={(value) => form.setValue('sumber_dana', value)} value={form.watch('sumber_dana')} disabled={!isAccountVerified || !profile?.is_active}>
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
                maxLength={250} // Added maxLength attribute
                disabled={!isAccountVerified || !profile?.is_active}
              />
              {/* Indikator Hitungan Karakter Dinamis */}
              <div className="col-start-2 col-span-3 text-right text-xs text-muted-foreground">
                {uraianWatch?.length || 0} / 250 karakter
              </div>
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
                disabled={!isAccountVerified || !profile?.is_active}
              />
              {form.formState.errors.jumlah_kotor && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jumlah_kotor.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || !isAccountVerified || !profile?.is_active}>
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
        onClose={() => setIsDetailModal(false)}
        tagihan={selectedTagihanForDetail}
      />
    </div>
  );
};

export default PortalSKPD;