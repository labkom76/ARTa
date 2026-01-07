import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EyeIcon, SearchIcon, EditIcon, Trash2Icon, FileTextIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon, Trash, UserPlus, ArrowRight, X, BarChart3, Banknote, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useDebounce from '@/hooks/use-debounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import TagihanDetailDialog from '@/components/TagihanDetailDialog';
import EditTagihanDialog from '@/components/EditTagihanDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import StatusBadge from '@/components/StatusBadge';
import { Combobox } from '@/components/ui/combobox';
import QuickAuditDialog from '@/components/QuickAuditDialog';
import { HistoryIcon } from 'lucide-react';

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
  sumber_dana?: string;
  tanggal_spm?: string;
}

interface SkpdOption {
  value: string;
  label: string;
}

interface VerifierOption {
  value: string;
  label: string;
}

const AdminTagihan = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [skpdOptions, setSkpdOptions] = useState<SkpdOption[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Year and Month Filter States
  const currentYearInt = new Date().getFullYear();
  const currentMonthInt = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState<string>(currentYearInt.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthInt.toString());
  const [selectedJenisSpm, setSelectedJenisSpm] = useState<string>('Semua Jenis SPM');
  const [selectedJenisTagihan, setSelectedJenisTagihan] = useState<string>('Semua Jenis Tagihan');
  const [selectedVerifierId, setSelectedVerifierId] = useState<string>('Semua Verifikator');

  const years = Array.from({ length: 5 }, (_, i) => (currentYearInt - i).toString());
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const [verifierOptions, setVerifierOptions] = useState<VerifierOption[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isFilterMinimized, setIsFilterMinimized] = useState(false);

  // Detail Dialog states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  // Edit Dialog states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);

  // Audit Dialog states
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedTagihanIdForAudit, setSelectedTagihanIdForAudit] = useState<{ id: string, spm: string } | null>(null);

  // Delete Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [tagihanToDelete, setTagihanToDelete] = useState<{ id: string; nomorSpm: string } | null>(null);

  // KPI States
  const [kpiStats, setKpiStats] = useState({
    totalCount: 0,
    totalNominal: 0,
    pendingAction: 0,
    breakdown: {
      menungguRegistrasi: 0,
      menungguVerifikasi: 0,
      tinjauKembali: 0
    },
    nominalBreakdown: {
      belumDiproses: 0,
      diteruskan: 0,
      dikembalikan: 0
    }
  });

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevSelectedStatus = useRef(selectedStatus);
  const prevSelectedSkpd = useRef(selectedSkpd);
  const prevDateRange = useRef(dateRange);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  // Fetch unique SKPD names for the dropdown
  useEffect(() => {
    const fetchSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('nama_skpd')
          .order('nama_skpd', { ascending: true });

        if (error) throw error;

        const uniqueSkpd: SkpdOption[] = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '')
          .map(skpd => ({ value: skpd, label: skpd }));

        setSkpdOptions([{ value: 'Semua SKPD', label: 'Semua SKPD' }, ...uniqueSkpd]);
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

  // Fetch active Staf Verifikator for transfer feature
  useEffect(() => {
    const fetchVerificatorList = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nama_lengkap')
          .eq('peran', 'Staf Verifikator')
          .eq('is_active', true)
          .order('nama_lengkap', { ascending: true });

        if (error) throw error;

        const formattedVerifiers: VerifierOption[] = (data || [])
          .filter(verifier => verifier.nama_lengkap && verifier.id)
          .map(verifier => ({
            value: verifier.id,
            label: verifier.nama_lengkap
          }));

        setVerifierOptions(formattedVerifiers);
      } catch (error: any) {
        console.error('Error fetching verifier list:', error.message);
        toast.error('Gagal memuat daftar verifikator: ' + error.message);
      }
    };
    fetchVerificatorList();
  }, []);

  const fetchTagihan = async (isPaginationOnlyChange = false) => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingData(true);
    } else {
      setLoadingPagination(true);
    }

    try {
      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' })
        .order('waktu_input', { ascending: false });

      if (debouncedSearchQuery) {
        query = query.or(
          `nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`
        );
      }

      if (selectedStatus !== 'Semua Status') {
        query = query.eq('status_tagihan', selectedStatus);
      }

      if (selectedSkpd !== 'Semua SKPD') {
        query = query.eq('nama_skpd', selectedSkpd);
      }

      if (dateRange?.from || dateRange?.to) {
        if (dateRange?.from) {
          query = query.gte('waktu_input', startOfDay(dateRange.from).toISOString());
        }
        if (dateRange?.to) {
          query = query.lte('waktu_input', endOfDay(dateRange.to).toISOString());
        }
      } else {
        // Only apply Year/Month filters if no date range is selected
        if (selectedYear !== 'Semua Tahun') {
          if (selectedMonth !== 'Semua Bulan') {
            const mIdx = parseInt(selectedMonth);
            const yVal = parseInt(selectedYear);
            const start = startOfMonth(new Date(yVal, mIdx));
            const end = endOfMonth(new Date(yVal, mIdx));
            query = query.gte('waktu_input', start.toISOString())
              .lte('waktu_input', end.toISOString());
          } else {
            query = query.gte('waktu_input', `${selectedYear}-01-01T00:00:00Z`)
              .lte('waktu_input', `${selectedYear}-12-31T23:59:59Z`);
          }
        }
      }

      if (selectedJenisSpm !== 'Semua Jenis SPM') {
        query = query.eq('jenis_spm', selectedJenisSpm);
      }

      if (selectedJenisTagihan !== 'Semua Jenis Tagihan') {
        query = query.eq('jenis_tagihan', selectedJenisTagihan);
      }

      if (selectedVerifierId !== 'Semua Verifikator') {
        const vName = verifierOptions.find(o => o.value === selectedVerifierId)?.label;
        if (vName) {
          query = query.eq('nama_verifikator', vName);
        }
      }

      if (itemsPerPage !== -1) {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setTagihanList(data as Tagihan[]);
      setTotalItems(count || 0);

      // Fetch Global Stats for Filtered Data (Total Nominal & Pending)
      let statsQuery = supabase
        .from('database_tagihan')
        .select('jumlah_kotor, status_tagihan');

      // Re-apply same filters for stats
      if (debouncedSearchQuery) {
        statsQuery = statsQuery.or(`nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`);
      }
      if (selectedStatus !== 'Semua Status') {
        statsQuery = statsQuery.eq('status_tagihan', selectedStatus);
      }
      if (selectedSkpd !== 'Semua SKPD') {
        statsQuery = statsQuery.eq('nama_skpd', selectedSkpd);
      }
      if (dateRange?.from) {
        statsQuery = statsQuery.gte('waktu_input', startOfDay(dateRange.from).toISOString());
        if (dateRange.to) {
          statsQuery = statsQuery.lte('waktu_input', endOfDay(dateRange.to).toISOString());
        }
      } else if (selectedYear !== 'Semua Tahun' || selectedMonth !== 'Semua Bulan') {
        const yearInt = selectedYear === 'Semua Tahun' ? currentYearInt : parseInt(selectedYear);
        if (selectedMonth !== 'Semua Bulan') {
          const monthDate = new Date(yearInt, parseInt(selectedMonth));
          statsQuery = statsQuery
            .gte('waktu_input', startOfMonth(monthDate).toISOString())
            .lte('waktu_input', endOfMonth(monthDate).toISOString());
        } else {
          statsQuery = statsQuery
            .gte('waktu_input', `${yearInt}-01-01T00:00:00`)
            .lte('waktu_input', `${yearInt}-12-31T23:59:59`);
        }
      }
      if (selectedJenisSpm !== 'Semua Jenis SPM') {
        statsQuery = statsQuery.eq('jenis_spm', selectedJenisSpm);
      }
      if (selectedJenisTagihan !== 'Semua Jenis Tagihan') {
        statsQuery = statsQuery.eq('jenis_tagihan', selectedJenisTagihan);
      }
      if (selectedVerifierId !== 'Semua Verifikator') {
        statsQuery = statsQuery.eq('id_pengguna_verifikasi', selectedVerifierId);
      }

      const { data: statsData } = await statsQuery.limit(10000); // Increase limit to avoid 1000 row cap for calculations

      if (statsData) {
        const totalNominal = statsData.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0);

        const menungguRegistrasi = statsData.filter(item => item.status_tagihan === 'Menunggu Registrasi').length;
        const menungguVerifikasi = statsData.filter(item => item.status_tagihan === 'Menunggu Verifikasi').length;
        const tinjauKembali = statsData.filter(item => item.status_tagihan === 'Tinjau Kembali').length;

        const nominalBelumDiproses = statsData
          .filter(item => ['Menunggu Registrasi', 'Menunggu Verifikasi', 'Tinjau Kembali'].includes(item.status_tagihan))
          .reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0);
        const nominalDiteruskan = statsData
          .filter(item => item.status_tagihan === 'Diteruskan')
          .reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0);
        const nominalDikembalikan = statsData
          .filter(item => item.status_tagihan === 'Dikembalikan')
          .reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0);

        const pendingAction = menungguRegistrasi + menungguVerifikasi + tinjauKembali;

        setKpiStats({
          totalCount: count || 0,
          totalNominal,
          pendingAction,
          breakdown: {
            menungguRegistrasi,
            menungguVerifikasi,
            tinjauKembali
          },
          nominalBreakdown: {
            belumDiproses: nominalBelumDiproses,
            diteruskan: nominalDiteruskan,
            dikembalikan: nominalDikembalikan
          }
        });
      }
    } catch (error: any) {
      console.error('Error fetching tagihan:', error.message);
      toast.error('Gagal memuat daftar tagihan: ' + error.message);
    } finally {
      if (!isPaginationOnlyChange) {
        setLoadingData(false);
      } else {
        setLoadingPagination(false);
      }
    }
  };

  useEffect(() => {
    let isPaginationOnlyChange = false;
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === searchQuery &&
      prevSelectedStatus.current === selectedStatus &&
      prevSelectedSkpd.current === selectedSkpd &&
      prevDateRange.current === dateRange &&
      prevItemsPerPage.current === itemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchTagihan(isPaginationOnlyChange);

    prevSearchQuery.current = searchQuery;
    prevSelectedStatus.current = selectedStatus;
    prevSelectedSkpd.current = selectedSkpd;
    prevDateRange.current = dateRange;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;

  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, selectedSkpd, dateRange, currentPage, itemsPerPage, selectedYear, selectedMonth, selectedJenisSpm, selectedJenisTagihan, selectedVerifierId]);

  const formatCompactRp = (val: number) => {
    if (!val || val === 0) return '0';
    if (val >= 1e9) {
      return `Rp${(val / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`;
    }
    if (val >= 1e6) {
      return `Rp${(val / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
    }
    return `Rp${val.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === tagihanList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tagihanList.map(t => t.id_tagihan));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(false);
    setIsBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('database_tagihan')
        .delete()
        .in('id_tagihan', selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} tagihan berhasil dihapus`);
      setSelectedIds([]);
      fetchTagihan();
    } catch (error: any) {
      toast.error('Gagal menghapus tagihan secara masal: ' + error.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.length === 0) return;

    setIsBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('database_tagihan')
        .update({ status_tagihan: newStatus })
        .in('id_tagihan', selectedIds);

      if (error) throw error;
      toast.success(`Status ${selectedIds.length} tagihan berhasil diubah menjadi ${newStatus}`);
      setSelectedIds([]);
      fetchTagihan();
    } catch (error: any) {
      toast.error('Gagal memperbarui status secara masal: ' + error.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkTransfer = async (verifierId: string) => {
    if (selectedIds.length === 0 || verifierId === 'Semua Verifikator') return;

    const verifier = verifierOptions.find(v => v.value === verifierId);
    if (!verifier) return;

    setIsBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from('database_tagihan')
        .update({
          id_pengguna_verifikasi: verifier.value,
          nama_verifikator: verifier.label,
          status_tagihan: 'Menunggu Verifikasi'
        })
        .in('id_tagihan', selectedIds);

      if (error) throw error;
      toast.success(`${selectedIds.length} tagihan berhasil dialihkan ke ${verifier.label}`);
      setSelectedIds([]);
      fetchTagihan();
    } catch (error: any) {
      toast.error('Gagal mengalihkan verifikator secara masal: ' + error.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleOpenAudit = (id: string, spm: string) => {
    setSelectedTagihanIdForAudit({ id, spm });
    setIsAuditModalOpen(true);
  };

  const handleCloseAudit = () => {
    setIsAuditModalOpen(false);
    setSelectedTagihanIdForAudit(null);
  };

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

  const handleEditClick = (tagihan: Tagihan) => {
    setEditingTagihan(tagihan);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTagihan(null);
  };

  const handleDeleteClick = (tagihan: Tagihan) => {
    setTagihanToDelete({ id: tagihan.id_tagihan, nomorSpm: tagihan.nomor_spm });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!tagihanToDelete) {
      toast.error('Tidak ada tagihan yang dipilih untuk dihapus.');
      return;
    }

    try {
      const { error } = await supabase
        .from('database_tagihan')
        .delete()
        .eq('id_tagihan', tagihanToDelete.id);

      if (error) throw error;

      toast.success(`Tagihan dengan Nomor SPM: ${tagihanToDelete.nomorSpm} berhasil dihapus.`);
      setIsDeleteDialogOpen(false);
      setTagihanToDelete(null);
      fetchTagihan();
    } catch (error: any) {
      console.error('Error deleting tagihan:', error.message);
      toast.error('Gagal menghapus tagihan: ' + error.message);
    }
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Memuat Halaman
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sedang memeriksa hak akses...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900/50 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Akses Ditolak
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Anda tidak memiliki izin untuk mengakses halaman ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <FileTextIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Manajemen Tagihan
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola semua tagihan dalam sistem
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-700">
        <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-50/80 text-sm font-medium uppercase tracking-wider">Total Tagihan</p>
                <h3 className="text-3xl font-bold text-white mt-1">{loadingData ? '...' : kpiStats.totalCount}</h3>
                <p className="text-emerald-50/60 text-xs mt-2 font-medium italic">Dokumen terfilter</p>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
          <CardContent className="p-6">
            <TooltipProvider>
              <div className="flex items-center justify-between pb-2">
                <div>
                  <p className="text-blue-50/80 text-sm font-medium uppercase tracking-wider">Total Nominal</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="text-2xl font-bold text-white mt-1 uppercase cursor-help">
                        {loadingData ? '...' : `Rp${kpiStats.totalNominal.toLocaleString('id-ID')}`}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent className="bg-white text-blue-900 font-bold border-blue-200">
                      <p>Full: Rp{kpiStats.totalNominal.toLocaleString('id-ID')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <Banknote className="h-8 w-8 text-white" />
                </div>
              </div>

              {!loadingData && (
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-1">
                  <div className="text-center">
                    <p className="text-[9px] text-blue-50/70 uppercase font-bold leading-tight">Belum Proses</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-[11px] font-bold text-white mt-1 cursor-help">
                          {formatCompactRp(kpiStats.nominalBreakdown.belumDiproses)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-blue-900 border-blue-200">
                        <p>Rp{kpiStats.nominalBreakdown.belumDiproses.toLocaleString('id-ID')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-center border-x border-white/10 px-0.5">
                    <p className="text-[9px] text-blue-50/70 uppercase font-bold leading-tight">Diteruskan</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-[11px] font-bold text-white mt-1 cursor-help">
                          {formatCompactRp(kpiStats.nominalBreakdown.diteruskan)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-blue-900 border-blue-200">
                        <p>Rp{kpiStats.nominalBreakdown.diteruskan.toLocaleString('id-ID')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-blue-50/70 uppercase font-bold leading-tight">Dikembalikan</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-[11px] font-bold text-white mt-1 cursor-help">
                          {formatCompactRp(kpiStats.nominalBreakdown.dikembalikan)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-white text-blue-900 border-blue-200">
                        <p>Rp{kpiStats.nominalBreakdown.dikembalikan.toLocaleString('id-ID')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
            </TooltipProvider>
            {loadingData && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <p className="text-amber-50/80 text-sm font-medium uppercase tracking-wider">Pending Action</p>
                <h3 className="text-3xl font-bold text-white mt-1">{loadingData ? '...' : kpiStats.pendingAction}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>

            {!loadingData && (
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-amber-50/70 uppercase">Reg</p>
                  <p className="text-sm font-bold text-white">{kpiStats.breakdown.menungguRegistrasi}</p>
                </div>
                <div className="text-center border-x border-white/10 px-1">
                  <p className="text-[10px] text-amber-50/70 uppercase">Verif</p>
                  <p className="text-sm font-bold text-white">{kpiStats.breakdown.menungguVerifikasi}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-amber-50/70 uppercase">Re-View</p>
                  <p className="text-sm font-bold text-white">{kpiStats.breakdown.tinjauKembali}</p>
                </div>
              </div>
            )}
            {loadingData && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse"></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
        <CardHeader
          className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 cursor-pointer select-none"
          onClick={() => setIsFilterMinimized(!isFilterMinimized)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <FilterIcon className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Filter & Pencarian Lanjutan
              </CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600">
              {isFilterMinimized ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>
        {!isFilterMinimized && (
          <CardContent className="pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Row 1: Tahun, Bulan, Rentang Tanggal */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Pilih Tahun</label>
                <Select value={selectedYear} onValueChange={(value) => { setSelectedYear(value); setCurrentPage(1); if (value !== 'Semua Tahun') setDateRange(undefined); }}>
                  <SelectTrigger className="w-full focus:ring-emerald-500"><SelectValue placeholder="Pilih Tahun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Tahun">Semua Tahun</SelectItem>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Pilih Bulan</label>
                <Select value={selectedMonth} onValueChange={(value) => { setSelectedMonth(value); setCurrentPage(1); if (value !== 'Semua Bulan') setDateRange(undefined); }}>
                  <SelectTrigger className="w-full focus:ring-emerald-500"><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Bulan">Semua Bulan</SelectItem>
                    {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Rentang Tanggal</label>
                <DateRangePickerWithPresets date={dateRange} onDateChange={(newDateRange) => { setDateRange(newDateRange); setCurrentPage(1); if (newDateRange?.from) { setSelectedYear('Semua Tahun'); setSelectedMonth('Semua Bulan'); } }} className="w-full" />
              </div>

              {/* Row 2: Status, SKPD, Verifikator */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Filter Status</label>
                <Select onValueChange={(value) => { setSelectedStatus(value); setCurrentPage(1); }} value={selectedStatus}>
                  <SelectTrigger className="w-full focus:ring-emerald-500"><SelectValue placeholder="Filter Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Status">Semua Status</SelectItem>
                    <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                    <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                    <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                    <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                    <SelectItem value="Tinjau Kembali">Tinjau Kembali</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Filter SKPD</label>
                <Combobox
                  options={skpdOptions}
                  value={selectedSkpd}
                  onValueChange={(value) => {
                    setSelectedSkpd(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Pilih SKPD"
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Filter Verifikator</label>
                <Select onValueChange={(value) => { setSelectedVerifierId(value); setCurrentPage(1); }} value={selectedVerifierId}>
                  <SelectTrigger className="w-full focus:ring-emerald-500">
                    <SelectValue placeholder="Filter Verifikator" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifierOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 3: Jenis SPM, Jenis Tagihan, Pencarian */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Jenis SPM</label>
                <Select onValueChange={(value) => { setSelectedJenisSpm(value); setCurrentPage(1); }} value={selectedJenisSpm}>
                  <SelectTrigger className="w-full focus:ring-emerald-500"><SelectValue placeholder="Pilih Jenis SPM" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Jenis SPM">Semua Jenis SPM</SelectItem>
                    <SelectItem value="Belanja Pegawai">Belanja Pegawai</SelectItem>
                    <SelectItem value="Belanja Barang Jasa">Belanja Barang Jasa</SelectItem>
                    <SelectItem value="Belanja Modal">Belanja Modal</SelectItem>
                    <SelectItem value="Belanja Hibah">Belanja Hibah</SelectItem>
                    <SelectItem value="Belanja Bantuan Sosial">Belanja Bantuan Sosial</SelectItem>
                    <SelectItem value="Belanja Tidak Terduga">Belanja Tidak Terduga</SelectItem>
                    <SelectItem value="Belanja Transfer">Belanja Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Jenis Tagihan</label>
                <Select onValueChange={(value) => { setSelectedJenisTagihan(value); setCurrentPage(1); }} value={selectedJenisTagihan}>
                  <SelectTrigger className="w-full focus:ring-emerald-500"><SelectValue placeholder="Pilih Jenis Tagihan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua Jenis Tagihan">Semua Jenis Tagihan</SelectItem>
                    <SelectItem value="Langsung (LS)">Langsung (LS)</SelectItem>
                    <SelectItem value="Uang Persediaan (UP)">Uang Persediaan (UP)</SelectItem>
                    <SelectItem value="Ganti Uang (GU)">Ganti Uang (GU)</SelectItem>
                    <SelectItem value="Tambah Uang (TU)">Tambah Uang (TU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Cari Data</label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari Nomor SPM atau Nama SKPD..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Table Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <FileTextIcon className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Daftar Tagihan
              </CardTitle>
            </div>


          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Items per page */}
          <div className="mb-5 flex items-center justify-end gap-2">
            <Label htmlFor="items-per-page" className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Tampilkan:
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px] h-9 border-slate-300 dark:border-slate-700">
                <SelectValue />
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
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={tagihanList.length > 0 && selectedIds.length === tagihanList.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Pilih semua"
                      className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                    />
                  </TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Waktu Input</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Nomor SPM</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Nama SKPD</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Jumlah Kotor</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Status</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Diperiksa oleh</TableHead>
                  <TableHead className="text-center font-bold text-emerald-900 dark:text-emerald-100">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData && !loadingPagination ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-12 h-12">
                          <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Memuat data tagihan...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tagihanList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                          <FileTextIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tidak ada data tagihan</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Coba ubah filter pencarian</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tagihanList.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan} className={`${selectedIds.includes(tagihan.id_tagihan) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''} hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(tagihan.id_tagihan)}
                          onCheckedChange={() => toggleSelectId(tagihan.id_tagihan)}
                          aria-label={`Pilih ${tagihan.nomor_spm}`}
                          className="border-emerald-500 data-[state=checked]:bg-emerald-500"
                        />
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{formatDate(tagihan.waktu_input)}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{tagihan.nomor_spm}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{tagihan.nama_skpd}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                      <TableCell><StatusBadge status={tagihan.status_tagihan} /></TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{tagihan.nama_verifikator || tagihan.nama_registrator || tagihan.id_korektor ? (tagihan.nama_verifikator || tagihan.nama_registrator || 'Staf Koreksi') : '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                            title="Jejak Audit"
                            onClick={() => handleOpenAudit(tagihan.id_tagihan, tagihan.nomor_spm)}
                          >
                            <HistoryIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                            title="Lihat Detail"
                            onClick={() => handleDetailClick(tagihan)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                            title="Edit Tagihan"
                            onClick={() => handleEditClick(tagihan)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors"
                            title="Hapus Tagihan"
                            onClick={() => handleDeleteClick(tagihan)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table >
          </div > {/* Tutup border wrapper - HARUS DI SINI */}

          {/* Pagination Controls */}
          <div className="px-6 py-4 mt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Menampilkan <span className="text-slate-900 dark:text-white font-semibold">{totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-900 dark:text-white font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="text-slate-900 dark:text-white font-semibold">{totalItems}</span> tagihan
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || itemsPerPage === -1 || loadingPagination}
                  className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </Button>
                <div className="px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || itemsPerPage === -1 || loadingPagination}
                  className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div >
        </CardContent >
      </Card >

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />

      <QuickAuditDialog
        // HMR Force Update
        isOpen={isAuditModalOpen}
        onClose={handleCloseAudit}
        tagihanId={selectedTagihanIdForAudit?.id || null}
        nomorSpm={selectedTagihanIdForAudit?.spm || null}
      />

      <EditTagihanDialog
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onTagihanUpdated={fetchTagihan}
        editingTagihan={editingTagihan}
        verifierOptions={verifierOptions}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan Tagihan"
        message={`Apakah Anda yakin ingin menghapus tagihan dengan Nomor SPM: ${tagihanToDelete?.nomorSpm || ''}? Tindakan ini tidak dapat diurungkan.`}
      />

      <DeleteConfirmationDialog
        isOpen={isBulkDeleteDialogOpen}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Konfirmasi Hapus Massal"
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.length} tagihan yang dipilih secara permanen? Tindakan ini tidak dapat diurungkan.`}
      />

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-full duration-500 ease-out">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-8 min-w-[600px]">
            <div className="flex items-center gap-4 pr-8 border-r border-white/10 text-nowrap">
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-500/20">
                {selectedIds.length}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white tracking-tight">Terpilih</span>
                <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">Item Tagihan</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select onValueChange={handleBulkTransfer} disabled={isBulkActionLoading}>
                <SelectTrigger className="w-[200px] h-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:ring-emerald-500">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-emerald-400" />
                    <SelectValue placeholder="Alihkan Verifikator" />
                  </div>
                </SelectTrigger>
                <SelectContent side="top">
                  {verifierOptions.filter(v => v.value !== 'Semua Verifikator').map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={handleBulkStatusUpdate} disabled={isBulkActionLoading}>
                <SelectTrigger className="w-[180px] h-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:ring-emerald-500">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-400" />
                    <SelectValue placeholder="Ubah Status" />
                  </div>
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                  <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                  <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                  <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                  <SelectItem value="Tinjau Kembali">Tinjau Kembali</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkActionLoading}
                className="h-10 px-3 hover:bg-red-500/10 hover:text-red-400 text-red-500 gap-2"
              >
                <Trash className="h-4 w-4" />
                <span>Hapus</span>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedIds([])}
              className="ml-4 h-10 w-10 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div >
  );
};

export default AdminTagihan;