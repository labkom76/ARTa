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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from 'date-fns'; // Import format, differenceInDays, parseISO
import { id as localeId } from 'date-fns/locale'; // Import locale for Indonesian date formatting, renamed to localeId
import { generateNomorSpm, getJenisTagihanCode } from '@/utils/spmGenerator'; // Import utility functions
import StatusBadge from '@/components/StatusBadge'; // Import StatusBadge
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircleIcon, SearchIcon, EditIcon, Trash2Icon, FileDownIcon, ArrowUp, ArrowDown, FilePenLine, EyeIcon, ClipboardListIcon, Sparkles, Undo2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import TagihanDetailDialog from '@/components/TagihanDetailDialog'; // Import the new detail dialog
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'; // Import useLocation and useNavigate
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import * as XLSX from 'xlsx'; // Import XLSX library
import Countdown from 'react-countdown'; // Import Countdown
import { Label } from '@/components/ui/label'; // Import Label component

import { Calendar } from '@/components/ui/calendar'; // Import Calendar
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'; // Import Popover
import { cn } from '@/lib/utils'; // Import cn utility
import { CalendarIcon } from 'lucide-react'; // Import CalendarIcon

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
  tanggal_spm: z.date({
    required_error: "Tanggal SPM wajib diisi.",
  }),
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
  tanggal_spm?: string; // Add tanggal_spm to Tagihan interface
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // State for controlling calendar popover

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
      // tanggal_spm field doesn't need a default value if it's required, or can be undefined initially
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
      // Determine which SKPD code to use for preview
      const skpdCodeForPreview = profile?.master_skpd?.kode_skpd_penagihan ? profile.master_skpd.kode_skpd_penagihan : kodeSkpd; // MODIFIED: Access nested property

      if (jenisTagihanWatch && kodeJadwalWatch && skpdCodeForPreview && kodeWilayah && nomorUrutTagihanWatch !== null && nomorUrutTagihanWatch !== undefined) {
        const newNomor = await generateNomorSpmCallback(jenisTagihanWatch, kodeJadwalWatch, skpdCodeForPreview, kodeWilayah, nomorUrutTagihanWatch);
        setGeneratedNomorSpm(newNomor);
      } else {
        setGeneratedNomorSpm(null);
      }
    };
    updateNomorSpm();
  }, [jenisTagihanWatch, kodeJadwalWatch, kodeSkpd, kodeWilayah, nomorUrutTagihanWatch, generateNomorSpmCallback, profile?.master_skpd?.kode_skpd_penagihan]); // MODIFIED: Add nested property to dependencies

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

      const { data, error, count } = await query; // MODIFIED: Added 'count' to destructuring

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
          tanggal_spm: editingTagihan.tanggal_spm ? parseISO(editingTagihan.tanggal_spm) : undefined, // Pre-fill Date
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
          tanggal_spm: undefined, // Reset Date
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
      if (!kodeWilayah) {
        toast.error('Kode Wilayah tidak tersedia. Gagal membuat Nomor SPM.');
        setIsSubmitting(false);
        return;
      }

      // Determine which SKPD code to use for SPM generation, prioritizing kode_skpd_penagihan
      const skpdCodeToUseForSpm = profile.master_skpd?.kode_skpd_penagihan || kodeSkpd;

      if (!skpdCodeToUseForSpm) {
        toast.error('Kode SKPD tidak tersedia. Gagal membuat Nomor SPM.');
        setIsSubmitting(false);
        return;
      }

      let finalNomorSpm: string | null = null;
      // Format date for handling (though Supabase handles JS Date objects well usually, let's be safe if needed or just pass object)
      // Supabase supports ISO strings. values.tanggal_spm is a Date object.
      const formattedTanggalSpm = values.tanggal_spm ? format(values.tanggal_spm, 'yyyy-MM-dd') : null;

      if (editingTagihan) {
        // Logic for UPDATE
        finalNomorSpm = await generateNomorSpmCallback(
          values.jenis_tagihan,
          values.kode_jadwal,
          skpdCodeToUseForSpm, // Use the determined SKPD code
          kodeWilayah,
          values.nomor_urut_tagihan
        );

        if (!finalNomorSpm) {
          toast.error('Gagal membuat Nomor SPM baru untuk tagihan yang diedit. Harap periksa input.');
          setIsSubmitting(false);
          return;
        }

        // Duplicate check for UPDATE
        const currentYear = format(new Date(), 'yyyy');
        const hasRelevantFieldsChanged =
          (editingTagihan && values.nomor_urut_tagihan !== editingTagihan.nomor_urut) ||
          (editingTagihan && values.kode_jadwal !== editingTagihan.kode_jadwal);

        if (hasRelevantFieldsChanged) {
          const isDuplicate = await isNomorSpmDuplicate(
            values.nomor_urut_tagihan,
            profile.asal_skpd, // Use profile.asal_skpd for duplicate check
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

        const updateObject: any = {
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          kode_jadwal: values.kode_jadwal,
          nomor_urut: values.nomor_urut_tagihan,
          nomor_spm: finalNomorSpm,
          sumber_dana: values.sumber_dana,
          tanggal_spm: formattedTanggalSpm, // Add tanggal_spm to update
          catatan_registrasi: null,
          skpd_can_edit: false,
        };

        if (editingTagihan.status_tagihan === 'Dikembalikan') {
          updateObject.status_tagihan = 'Menunggu Verifikasi';
        } else {
          updateObject.status_tagihan = 'Menunggu Registrasi';
          updateObject.tenggat_perbaikan = null;
        }

        const { data, error } = await supabase
          .from('database_tagihan')
          .update(updateObject)
          .eq('id_tagihan', editingTagihan.id_tagihan)
          .eq('id_pengguna_input', user.id)
          .select();

        if (error) {
          console.error('Supabase update error:', error);
          toast.error('Gagal memperbarui tagihan: ' + error.message);
          setIsSubmitting(false);
          return;
        }

        if (!data || data.length === 0) {
          console.warn('Supabase update warning: No rows affected. Possible RLS issue or record not found/editable.');
          toast.error('Gagal memperbarui tagihan: Tidak ada perubahan yang disimpan. Pastikan Anda memiliki izin untuk mengedit tagihan ini.');
          setIsSubmitting(false);
          return;
        }

        toast.success('Tagihan berhasil diperbarui!');

      } else {
        // Logic for INSERT (new tagihan)
        finalNomorSpm = await generateNomorSpmCallback(
          values.jenis_tagihan,
          values.kode_jadwal,
          skpdCodeToUseForSpm, // Use the determined SKPD code here
          kodeWilayah,
          values.nomor_urut_tagihan
        );

        if (!finalNomorSpm) {
          toast.error('Gagal membuat Nomor SPM baru. Harap periksa input.');
          setIsSubmitting(false);
          return;
        }

        // Duplicate check for INSERT
        const currentYear = format(new Date(), 'yyyy');
        const isDuplicate = await isNomorSpmDuplicate(
          values.nomor_urut_tagihan,
          profile.asal_skpd, // Use profile.asal_skpd for duplicate check
          values.kode_jadwal,
          currentYear,
          null // No tagihan to exclude for new insert
        );

        if (isDuplicate) {
          toast.error('Nomor Urut Tagihan ini sudah digunakan untuk SKPD dan Jadwal yang sama di tahun ini. Silakan gunakan nomor lain.');
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from('database_tagihan').insert({
          id_pengguna_input: user.id,
          nama_skpd: profile.asal_skpd,
          nomor_spm: finalNomorSpm, // Insert generated Nomor SPM
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          kode_jadwal: values.kode_jadwal,
          nomor_urut: values.nomor_urut_tagihan,
          sumber_dana: values.sumber_dana,
          tanggal_spm: formattedTanggalSpm, // Add tanggal_spm to insert
          status_tagihan: 'Menunggu Registrasi',
        });

        if (error) {
          console.error('Supabase insert error:', error);
          toast.error('Gagal menyimpan tagihan: ' + error.message);
          setIsSubmitting(false);
          return;
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
      'Tanggal SPM': tagihan.tanggal_spm ? format(parseISO(tagihan.tanggal_spm), 'dd MMMM yyyy', { locale: localeId }) : '-', // Add Tanggal SPM
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
          Selesaikan sebelum: {days > 0 && `${days} hari `}{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
          <ClipboardListIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          Portal SKPD
        </h1>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Kelola dan input tagihan baru Anda di sini
        </p>
      </div>

      <div className="flex justify-end items-center mb-6">
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors" onClick={handleExportToXLSX} disabled={!isAccountVerified || tagihanList.length === 0}>
            <FileDownIcon className="h-4 w-4" /> Export ke XLSX
          </Button>
          <Button onClick={() => { setEditingTagihan(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 transition-all shadow-sm hover:shadow-md" disabled={!isAccountVerified || !profile?.is_active}>
            <PlusCircleIcon className="h-4 w-4" /> Input Tagihan Baru
          </Button>
        </div>
      </div>

      {/* Card for Table (now includes filters) */}
      <Card className="shadow-md hover:shadow-lg transition-all duration-300 rounded-lg border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200 dark:border-emerald-900/30">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
              <ClipboardListIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Daftar Tagihan</h2>
          </div>
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
                className="pl-9 w-full focus-visible:ring-emerald-500"
              />
            </div>
            <Select onValueChange={(value) => { setSelectedStatus(value); setCurrentPage(1); }} value={selectedStatus}>
              <SelectTrigger className="w-full sm:w-[200px] focus:ring-emerald-500">
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
                <SelectTrigger className="w-[100px] focus:ring-emerald-500">
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
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                  Memuat tagihan...
                </p>
              </div>
            </div>
          ) : tagihanList.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan ditemukan.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table key={`${selectedStatus}-${currentPage}`}>
                  <TableHeader className="bg-gray-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="w-[50px] text-gray-700 dark:text-slate-300">No.</TableHead>
                      <TableHead className="w-[180px]"> {/* MODIFIED: Set fixed width for Nomor SPM */}
                        <Button variant="ghost" onClick={() => handleSort('nomor_spm')} className={`p-0 h-auto hover:text-emerald-600 dark:hover:text-emerald-400 ${sortColumn === 'nomor_spm' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>
                          Nomor SPM
                          {sortColumn === 'nomor_spm' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('jenis_spm')} className={`p-0 h-auto hover:text-emerald-600 dark:hover:text-emerald-400 ${sortColumn === 'jenis_spm' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>
                          Jenis SPM
                          {sortColumn === 'jenis_spm' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('jenis_tagihan')} className={`p-0 h-auto hover:text-emerald-600 dark:hover:text-emerald-400 ${sortColumn === 'jenis_tagihan' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>
                          Jenis Tagihan
                          {sortColumn === 'jenis_tagihan' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('sumber_dana')} className={`p-0 h-auto hover:text-emerald-600 dark:hover:text-emerald-400 ${sortColumn === 'sumber_dana' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>
                          Sumber Dana
                          {sortColumn === 'sumber_dana' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('jumlah_kotor')} className={`p-0 h-auto hover:text-emerald-600 dark:hover:text-emerald-400 ${sortColumn === 'jumlah_kotor' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>
                          Jumlah Kotor
                          {sortColumn === 'jumlah_kotor' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('status_tagihan')} className={`p-0 h-auto hover:text-emerald-600 dark:hover:text-emerald-400 ${sortColumn === 'status_tagihan' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-gray-700 dark:text-slate-300'}`}>
                          Status
                          {sortColumn === 'status_tagihan' && (
                            sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-center w-[100px] text-gray-700 dark:text-slate-300">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagihanList.map((tagihan, index) => {
                      // NEW: Conditional rendering for edit button
                      const canEdit = tagihan.status_tagihan === 'Menunggu Registrasi' ||
                        tagihan.status_tagihan === 'Tinjau Kembali' ||
                        (tagihan.status_tagihan === 'Dikembalikan' && tagihan.skpd_can_edit === true && tagihan.tenggat_perbaikan && new Date(tagihan.tenggat_perbaikan) > new Date());

                      // Logic for countdown timer
                      const showCountdown = tagihan.status_tagihan === 'Dikembalikan' &&
                        tagihan.tenggat_perbaikan &&
                        tagihan.waktu_verifikasi &&
                        differenceInDays(parseISO(tagihan.tenggat_perbaikan), parseISO(tagihan.waktu_verifikasi)) > 1;

                      return (
                        <TooltipProvider key={tagihan.id_tagihan + "-row-tooltip"}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TableRow className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                <TableCell className="text-gray-600 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                                <TableCell className="font-medium w-[180px] overflow-hidden text-gray-900 dark:text-slate-200"> {/* MODIFIED: Set fixed width and overflow */}
                                  <span className="block max-w-full truncate whitespace-nowrap overflow-hidden text-ellipsis">
                                    {tagihan.nomor_spm}
                                  </span>
                                </TableCell>
                                <TableCell className="text-gray-600 dark:text-slate-300">{tagihan.jenis_spm}</TableCell>
                                <TableCell className="text-gray-600 dark:text-slate-300">{tagihan.jenis_tagihan}</TableCell>
                                <TableCell className="text-gray-600 dark:text-slate-300">{tagihan.sumber_dana || '-'}</TableCell>
                                <TableCell className="text-gray-600 dark:text-slate-300">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
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
                                      <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)} className="hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400">
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
                                        className="hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
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
                                      <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)} className="hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400">
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
                  className="hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || itemsPerPage === -1 || loadingPagination}
                  className="hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors"
                >
                  Berikutnya
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card >

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setEditingTagihan(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                {editingTagihan ? (
                  <EditIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <PlusCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <DialogTitle>{editingTagihan ? 'Edit Tagihan' : 'Input Tagihan Baru'}</DialogTitle>
                <DialogDescription>
                  {editingTagihan ? 'Perbarui detail tagihan Anda.' : 'Masukkan detail tagihan baru Anda di sini.'} Klik simpan setelah selesai.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* NEW: Display catatan_registrasi if status is 'Tinjau Kembali' */}
            {editingTagihan && editingTagihan.status_tagihan === 'Tinjau Kembali' && editingTagihan.catatan_registrasi && (
              <div className="grid gap-2 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-md mb-4">
                <div className="flex items-center gap-2">
                  <Undo2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <Label className="text-amber-700 dark:text-amber-300 font-semibold">Catatan Peninjauan Kembali dari Staf Registrasi:</Label>
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
                  {editingTagihan.catatan_registrasi.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Nomor SPM (Otomatis)
              </Label>
              <div className="col-span-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 cursor-help">
                        <p className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate leading-relaxed">
                          {generatedNomorSpm || 'Membuat Nomor SPM...'}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{generatedNomorSpm || 'Membuat Nomor SPM...'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
                className="col-span-3 focus-visible:ring-emerald-500"
                disabled={!isAccountVerified || !profile?.is_active} // MODIFIED: Removed || !!editingTagihan
              />
              {form.formState.errors.nomor_urut_tagihan && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.nomor_urut_tagihan.message}
                </p>
              )}
            </div>
            {/* Tanggal SPM - NEW */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tanggal_spm" className="text-right">
                Tanggal SPM
              </Label>
              <div className="col-span-3">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("tanggal_spm") && "text-muted-foreground"
                      )}
                      disabled={!isAccountVerified || !profile?.is_active}
                      onClick={() => setIsCalendarOpen(true)} // Explicitly open on click
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("tanggal_spm") ? (
                        format(form.watch("tanggal_spm")!, "dd MMMM yyyy", { locale: localeId })
                      ) : (
                        <span>Pilih Tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("tanggal_spm") as Date}
                      onSelect={(date) => {
                        form.setValue("tanggal_spm", date as Date);
                        setIsCalendarOpen(false); // Close calendar on select
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.tanggal_spm && (
                  <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.tanggal_spm.message}
                  </p>
                )}
              </div>
            </div>

            {/* Jadwal Penganggaran */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kode_jadwal" className="text-right">
                Jadwal Penganggaran
              </Label>
              <Select onValueChange={(value) => form.setValue('kode_jadwal', value)} value={form.watch('kode_jadwal')} disabled={!isAccountVerified || !profile?.is_active}>
                <SelectTrigger className="col-span-3 focus-visible:ring-emerald-500">
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
                <SelectTrigger className="col-span-3 focus-visible:ring-emerald-500">
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
                <SelectTrigger className="col-span-3 focus-visible:ring-emerald-500">
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
                <SelectTrigger className="col-span-3 focus-visible:ring-emerald-500">
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
                className="col-span-3 focus-visible:ring-emerald-500"
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
                className="col-span-3 focus-visible:ring-emerald-500"
                disabled={!isAccountVerified || !profile?.is_active}
              />
              {form.formState.errors.jumlah_kotor && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jumlah_kotor.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500" disabled={isSubmitting || !isAccountVerified || !profile?.is_active}>
                {isSubmitting ? (editingTagihan ? 'Memperbarui...' : 'Menyimpan...') : (editingTagihan ? 'Update' : 'Simpan')}
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
    </div >
  );
};

export default PortalSKPD;