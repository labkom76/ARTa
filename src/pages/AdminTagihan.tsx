import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EyeIcon, SearchIcon, EditIcon, Trash2Icon, FileTextIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import TagihanDetailDialog from '@/components/TagihanDetailDialog';
import EditTagihanDialog from '@/components/EditTagihanDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import StatusBadge from '@/components/StatusBadge';
import { Combobox } from '@/components/ui/combobox';

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
  const [verifierOptions, setVerifierOptions] = useState<VerifierOption[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Detail Dialog states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  // Edit Dialog states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);

  // Delete Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tagihanToDelete, setTagihanToDelete] = useState<{ id: string; nomorSpm: string } | null>(null);

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

      if (dateRange?.from) {
        query = query.gte('waktu_input', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('waktu_input', endOfDay(dateRange.to).toISOString());
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

  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, selectedSkpd, dateRange, currentPage, itemsPerPage]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
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

      {/* Filter Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <FilterIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Filter & Pencarian
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
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

            {/* Status Filter */}
            <Select onValueChange={(value) => { setSelectedStatus(value); setCurrentPage(1); }} value={selectedStatus}>
              <SelectTrigger className="border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Status">Semua Status</SelectItem>
                <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>

            {/* SKPD Filter */}
            <Combobox
              options={skpdOptions}
              value={selectedSkpd}
              onValueChange={(value) => {
                setSelectedSkpd(value);
                setCurrentPage(1);
              }}
              placeholder="Filter SKPD"
              className="border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Date Range - Full Width Below */}
          <div className="mt-4">
            <DateRangePickerWithPresets
              date={dateRange}
              onDateChange={(newDateRange) => {
                setDateRange(newDateRange);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto"
            />
          </div>
        </CardContent>
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
                    <TableCell colSpan={7} className="text-center py-12">
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
                    <TableCell colSpan={7} className="text-center py-12">
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
                    <TableRow key={tagihan.id_tagihan} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
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
    </div >
  );
};

export default AdminTagihan;