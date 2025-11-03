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
import { SearchIcon, EyeIcon, PrinterIcon } from 'lucide-react'; // Import PrinterIcon
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components
import StatusBadge from '@/components/StatusBadge'; // Import StatusBadge
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { Combobox } from '@/components/ui/combobox'; // Import Combobox

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

interface VerifierOption {
  value: string;
  label: string;
}

interface SkpdOption { // New interface for SKPD options
  value: string;
  label: string;
}

const RiwayatVerifikasi = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false); // New state for pagination loading
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // New states for Verifier Filter
  const [selectedVerifierId, setSelectedVerifierId] = useState<string>('Semua Verifikator');
  const [verifierOptions, setVerifierOptions] = useState<VerifierOption[]>([]);

  // NEW: State for SKPD Filter
  const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
  const [skpdOptions, setSkpdOptions] = useState<SkpdOption[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = React.useRef(searchQuery);
  const prevSelectedStatus = React.useRef(selectedStatus);
  const prevDateRange = React.useRef(dateRange);
  const prevItemsPerPage = React.useRef(itemsPerPage);
  const prevCurrentPage = React.useRef(currentPage);
  const prevSelectedVerifierId = React.useRef(selectedVerifierId); // New ref for verifier filter
  const prevSelectedSkpd = React.useRef(selectedSkpd); // NEW: Ref for SKPD filter

  // Ref for search input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch verifier options on component mount
  useEffect(() => {
    const fetchVerifierOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nama_lengkap')
          .eq('peran', 'Staf Verifikator')
          .order('nama_lengkap', { ascending: true });

        if (error) throw error;

        const options: VerifierOption[] = [
          { value: 'Semua Verifikator', label: 'Semua Verifikator' },
          ...(data || []).map(p => ({ value: p.id, label: p.nama_lengkap || 'Nama Tidak Diketahui' }))
        ];
        setVerifierOptions(options);
      } catch (error: any) {
        console.error('Error fetching verifier options:', error.message);
        toast.error('Gagal memuat daftar verifikator: ' + error.message);
      }
    };
    fetchVerifierOptions();
  }, []);

  // NEW: Fetch SKPD options on component mount
  useEffect(() => {
    const fetchSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('nama_skpd')
          .order('nama_skpd', { ascending: true });

        if (error) throw error;

        const options: SkpdOption[] = [
          { value: 'Semua SKPD', label: 'Semua SKPD' },
          ...(data || []).map(s => ({ value: s.nama_skpd, label: s.nama_skpd }))
        ];
        setSkpdOptions(options);
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

  useEffect(() => {
    const fetchRiwayatVerifikasi = async (isPaginationOnlyChange = false) => {
      if (sessionLoading || (profile?.peran !== 'Staf Verifikator' && profile?.peran !== 'Administrator')) {
        setLoadingData(false);
        return;
      }

      if (!isPaginationOnlyChange) {
        setLoadingData(true); // Show full loading spinner for search/filter changes
      } else {
        setLoadingPagination(true); // Only disable pagination buttons for page changes
      }

      try {
        let query = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .order('waktu_verifikasi', { ascending: false }); // Order by most recent verification

        // Apply primary filter: status_tagihan must be 'Diteruskan' or 'Dikembalikan'
        query = query.in('status_tagihan', ['Diteruskan', 'Dikembalikan']);

        // Conditional filter for 'Staf Verifikator'
        if (profile?.peran === 'Staf Verifikator') {
          query = query.is('id_korektor', null);
        }

        if (debouncedSearchQuery) {
          query = query.or(
            `nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`
          );
        }

        // Apply new status filter if not 'Semua Status'
        if (selectedStatus !== 'Semua Status') {
          query = query.eq('status_tagihan', selectedStatus);
        }

        // Apply date range filter
        if (dateRange?.from) {
          query = query.gte('waktu_verifikasi', startOfDay(dateRange.from).toISOString());
        }
        if (dateRange?.to) {
          query = query.lte('waktu_verifikasi', endOfDay(dateRange.to).toISOString());
        }

        // Apply verifier filter (NEW)
        if (selectedVerifierId !== 'Semua Verifikator') {
          // Find the label (nama_lengkap) corresponding to the selected ID
          const verifierName = verifierOptions.find(opt => opt.value === selectedVerifierId)?.label;
          if (verifierName) {
            query = query.eq('nama_verifikator', verifierName);
          }
        }

        // NEW: Apply SKPD filter
        if (selectedSkpd !== 'Semua SKPD') {
          query = query.eq('nama_skpd', selectedSkpd);
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
        console.error('Error fetching riwayat verifikasi:', error.message);
        toast.error('Gagal memuat riwayat verifikasi: ' + error.message);
      } finally {
        if (!isPaginationOnlyChange) {
          setLoadingData(false);
        } else {
          setLoadingPagination(false);
        }
      }
    };

    let isPaginationOnlyChange = false;
    // Check if only currentPage changed, while other filters/search/itemsPerPage remained the same
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === searchQuery &&
      prevSelectedStatus.current === selectedStatus &&
      prevDateRange.current === dateRange &&
      prevItemsPerPage.current === itemsPerPage &&
      prevSelectedVerifierId.current === selectedVerifierId && // Include new ref
      prevSelectedSkpd.current === selectedSkpd // NEW: Include SKPD filter ref
    ) {
      isPaginationOnlyChange = true;
    }

    fetchRiwayatVerifikasi(isPaginationOnlyChange);

    // Update refs for the next render cycle
    prevSearchQuery.current = searchQuery;
    prevSelectedStatus.current = selectedStatus;
    prevDateRange.current = dateRange;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;
    prevSelectedVerifierId.current = selectedVerifierId; // Update new ref
    prevSelectedSkpd.current = selectedSkpd; // NEW: Update SKPD filter ref

  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, dateRange, currentPage, itemsPerPage, selectedVerifierId, selectedSkpd, verifierOptions, skpdOptions]); // Add selectedSkpd and skpdOptions to dependencies

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

  const handlePrintClick = (tagihanId: string) => {
    if (profile?.peran === 'Staf Koreksi') {
      const printWindow = window.open(`/print-koreksi?id=${tagihanId}`, '_blank', 'width=800,height=900,scrollbars=yes');
      if (printWindow) {
        printWindow.focus();
      } else {
        toast.error('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.');
      }
    } else if (profile?.peran === 'Staf Verifikator') {
      const printWindow = window.open(`/print-verifikasi?id=${tagihanId}`, '_blank', 'width=800,height=900,scrollbars=yes');
      if (printWindow) {
        printWindow.focus();
      } else {
        toast.error('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.');
      }
    } else {
      toast.error('Peran Anda tidak memiliki izin untuk mencetak.');
    }
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

  if (profile?.peran !== 'Staf Verifikator' && profile?.peran !== 'Administrator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Riwayat Verifikasi Tagihan</h1>

      {/* Area Kontrol Filter */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1 w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                ref={searchInputRef} // Lampirkan Ref ke Input
                type="text"
                placeholder="Cari berdasarkan Nomor SPM atau Nama SKPD..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
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
                <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => { setSelectedVerifierId(value); setCurrentPage(1); }} value={selectedVerifierId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter Nama Verifikator" />
              </SelectTrigger>
              <SelectContent>
                {verifierOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* NEW: Combobox for SKPD Filter */}
            <Combobox
              options={skpdOptions}
              value={selectedSkpd}
              onValueChange={(value) => {
                setSelectedSkpd(value);
                setCurrentPage(1); // Reset to first page on SKPD change
              }}
              placeholder="Filter SKPD"
              className="w-full sm:w-[200px]"
            />
            <DateRangePickerWithPresets
              date={dateRange}
              onDateChange={(newDateRange) => {
                setDateRange(newDateRange);
                setCurrentPage(1); // Reset to first page on date range change
              }}
              className="w-full sm:w-auto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabel untuk riwayat verifikasi */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Riwayat Verifikasi</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Moved "Baris per halaman" here */}
          <div className="mb-4 flex justify-end items-center space-x-2">
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                  <TableHead className="w-[50px]">No.</TableHead><TableHead>Waktu Verifikasi</TableHead><TableHead>Nomor Verifikasi</TableHead><TableHead>Nama SKPD</TableHead><TableHead>Nomor SPM</TableHead><TableHead>Jumlah Kotor</TableHead><TableHead>Status Akhir</TableHead><TableHead>Diperiksa oleh</TableHead><TableHead className="text-center">Aksi</TableHead>
                </TableRow></TableHeader>
              <TableBody>
                {loadingData && !loadingPagination ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Memuat data riwayat verifikasi...
                    </TableCell>
                  </TableRow>
                ) : tagihanList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Tidak ada data riwayat verifikasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  tagihanList.map((tagihan, index) => (
                    <TableRow key={tagihan.id_tagihan}><TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell><TableCell>
                      {tagihan.waktu_verifikasi ? format(parseISO(tagihan.waktu_verifikasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                    </TableCell><TableCell className="font-medium">{tagihan.nomor_verifikasi || '-'}</TableCell><TableCell>{tagihan.nama_skpd}</TableCell><TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger className="max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis block">
                          {tagihan.nomor_spm}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tagihan.nomor_spm}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell><TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell><TableCell><StatusBadge status={tagihan.status_tagihan} /></TableCell><TableCell>{tagihan.nama_verifikator || '-'}</TableCell><TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" title="Cetak" onClick={() => handlePrintClick(tagihan.id_tagihan)}>
                          <PrinterIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell></TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
        </CardContent>
      </Card>

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />
    </div>
  );
};

export default RiwayatVerifikasi;