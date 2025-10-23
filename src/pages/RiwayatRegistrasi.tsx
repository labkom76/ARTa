import React, { useEffect, useState, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchIcon, EyeIcon, PrinterIcon } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import TagihanDetailDialog from '@/components/TagihanDetailDialog';
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
import StatusBadge from '@/components/StatusBadge'; // Import StatusBadge

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
}

const RiwayatRegistrasi = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevSelectedStatus = useRef(selectedStatus);
  const prevDateRange = useRef(dateRange);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);

  // 1. Buat Ref untuk Input
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRiwayatRegistrasi = async (isPaginationOnlyChange = false) => {
      if (sessionLoading || profile?.peran !== 'Staf Registrasi') {
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
          .not('status_tagihan', 'eq', 'Menunggu Registrasi')
          .order('waktu_registrasi', { ascending: false });

        if (debouncedSearchQuery) {
          query = query.or(
            `nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`
          );
        }

        if (selectedStatus !== 'Semua Status') {
          query = query.eq('status_tagihan', selectedStatus);
        }

        if (dateRange?.from) {
          query = query.gte('waktu_registrasi', startOfDay(dateRange.from).toISOString());
        }
        if (dateRange?.to) {
          query = query.lte('waktu_registrasi', endOfDay(dateRange.to).toISOString());
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
        console.error('Error fetching riwayat registrasi:', error.message);
        toast.error('Gagal memuat riwayat registrasi: ' + error.message);
      } finally {
        if (!isPaginationOnlyChange) {
          setLoadingData(false);
        } else {
          setLoadingPagination(false);
        }
      }
    };

    let isPaginationOnlyChange = false;
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === searchQuery &&
      prevSelectedStatus.current === selectedStatus &&
      prevDateRange.current === dateRange &&
      prevItemsPerPage.current === itemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchRiwayatRegistrasi(isPaginationOnlyChange);

    prevSearchQuery.current = searchQuery;
    prevSelectedStatus.current = selectedStatus;
    prevDateRange.current = dateRange;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;

  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, dateRange, currentPage, itemsPerPage]);

  // Efek baru untuk mengembalikan fokus ke input pencarian setelah loading selesai
  useEffect(() => {
    if (!loadingData && !loadingPagination && debouncedSearchQuery && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loadingData, loadingPagination, debouncedSearchQuery]);

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  if (sessionLoading || loadingData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Registrasi') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Riwayat Registrasi Tagihan</h1>

      {/* Area Kontrol Filter */}
      <div className="mb-6 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1 w-full sm:w-auto">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            ref={searchInputRef} // Lampirkan Ref ke Input
            type="text"
            placeholder="Cari berdasarkan Nomor SPM atau Nama SKPD..."
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
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua Status">Semua Status</SelectItem>
            <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
            <SelectItem value="Diteruskan">Diteruskan</SelectItem>
            <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePickerWithPresets date={dateRange} onDateChange={(newDateRange) => { setDateRange(newDateRange); setCurrentPage(1); }} className="w-full sm:w-auto" />
        {/* Moved "Baris per halaman" here */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1); // Reset to first page when items per page changes
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

      <div className="overflow-x-auto">
        <Table><TableHeader><TableRow>
              <TableHead className="w-[50px]">No.</TableHead><TableHead>Waktu Registrasi</TableHead><TableHead>Nomor Registrasi</TableHead><TableHead>Nomor SPM</TableHead><TableHead>Nama SKPD</TableHead><TableHead className="min-w-[280px]">Uraian</TableHead><TableHead>Jumlah Kotor</TableHead><TableHead>Status Tagihan</TableHead><TableHead className="text-center">Aksi</TableHead>
            </TableRow></TableHeader><TableBody>
            {loadingData && !loadingPagination ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Memuat data riwayat registrasi...
                </TableCell>
              </TableRow>
            ) : tagihanList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Tidak ada data riwayat registrasi.
                </TableCell>
              </TableRow>
            ) : (
              tagihanList.map((tagihan, index) => (
                <TableRow key={tagihan.id_tagihan}>
                  <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell><TableCell>
                    {tagihan.waktu_registrasi ? format(parseISO(tagihan.waktu_registrasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                  </TableCell><TableCell className="font-medium">{tagihan.nomor_registrasi || '-'}</TableCell><TableCell>{tagihan.nomor_spm}</TableCell><TableCell>{tagihan.nama_skpd}</TableCell><TableCell className="min-w-[280px]">{tagihan.uraian}</TableCell><TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell><TableCell><StatusBadge status={tagihan.status_tagihan} /></TableCell><TableCell className="text-center">
                    <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody></Table>
      </div>

      {/* Pagination Controls */}
      <div className="mt-6 flex items-center justify-end space-x-4">
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

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />
    </div>
  );
};

export default RiwayatRegistrasi;