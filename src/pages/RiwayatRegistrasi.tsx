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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchIcon, EyeIcon, PrinterIcon, ClockIcon, Sparkles, FilterIcon, Copy, Check } from 'lucide-react'; // Import PrinterIcon, ClockIcon, Sparkles, FilterIcon, Copy, Check
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
  tanggal_spm?: string;
}

interface SkpdOption {
  value: string;
  label: string;
}

const RiwayatRegistrasi = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
  const [skpdOptions, setSkpdOptions] = useState<SkpdOption[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevSelectedStatus = useRef(selectedStatus);
  const prevSelectedSkpd = useRef(selectedSkpd);
  const prevDateRange = useRef(dateRange);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);

  // 1. Buat Ref untuk Input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch SKPD list
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
          .map(skpd => ({ value: skpd, label: skpd })); // Map to { value, label } format

        setSkpdOptions([{ value: 'Semua SKPD', label: 'Semua SKPD' }, ...uniqueSkpd]); // Add 'Semua SKPD' option
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

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
          .in('status_tagihan', ['Menunggu Verifikasi', 'Diteruskan', 'Dikembalikan']) // MODIFIED: Hanya ambil status yang sudah diregistrasi
          .order('waktu_registrasi', { ascending: false });

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
      prevSelectedSkpd.current === selectedSkpd &&
      prevDateRange.current === dateRange &&
      prevItemsPerPage.current === itemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchRiwayatRegistrasi(isPaginationOnlyChange);

    prevSearchQuery.current = searchQuery;
    prevSelectedStatus.current = selectedStatus;
    prevSelectedSkpd.current = selectedSkpd;
    prevDateRange.current = dateRange;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;

  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, selectedSkpd, dateRange, currentPage, itemsPerPage]);

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

  const handleCopyUraian = async (uraian: string, id: string) => {
    try {
      await navigator.clipboard.writeText(uraian);
      setCopiedId(id);
      toast.success('Uraian berhasil disalin!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Gagal menyalin uraian');
    }
  };

  const handleCopySkpd = async (skpd: string, id: string) => {
    try {
      await navigator.clipboard.writeText(skpd);
      setCopiedId(id + '_skpd');
      toast.success('Nama SKPD berhasil disalin!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Gagal menyalin nama SKPD');
    }
  };

  const handleCopyJumlah = async (jumlah: number, id: string) => {
    try {
      await navigator.clipboard.writeText(jumlah.toString());
      setCopiedId(id + '_jumlah');
      toast.success('Jumlah kotor berhasil disalin!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Gagal menyalin jumlah kotor');
    }
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  if (sessionLoading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Memuat Riwayat Registrasi
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sedang memeriksa hak akses dan mengambil data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Registrasi') {
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
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
          <ClockIcon className="h-10 w-10 text-slate-600 dark:text-slate-400" />
          Riwayat Registrasi Tagihan
        </h1>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-500" />
          Lihat riwayat tagihan yang sudah diregistrasi
        </p>
      </div>

      {/* Filter Panel - Separate Card */}
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <FilterIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Filter Data</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1 w-full sm:w-auto">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Cari berdasarkan Nomor SPM atau Nama SKPD..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-full focus-visible:ring-slate-500"
            />
          </div>
          <Select onValueChange={(value) => { setSelectedStatus(value); setCurrentPage(1); }} value={selectedStatus}>
            <SelectTrigger className="w-full sm:w-[200px] focus:ring-slate-500">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua Status">Semua Status</SelectItem>
              <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
              <SelectItem value="Diteruskan">Diteruskan</SelectItem>
              <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
            </SelectContent>
          </Select>
          <Combobox
            options={skpdOptions}
            value={selectedSkpd}
            onValueChange={(value) => {
              setSelectedSkpd(value);
              setCurrentPage(1);
            }}
            placeholder="Filter SKPD"
            className="w-full sm:w-[200px]"
          />
          <DateRangePickerWithPresets date={dateRange} onDateChange={(newDateRange) => { setDateRange(newDateRange); setCurrentPage(1); }} className="w-full sm:w-auto" />
        </div>
      </div>

      {/* Table Panel */}
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        {/* Baris per halaman - Inside Table Panel */}
        <div className="mb-4 flex items-center justify-end space-x-2">
          <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[100px] focus:ring-slate-500">
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
          <Table><TableHeader><TableRow>
            <TableHead className="w-[50px]">No.</TableHead><TableHead>Waktu Registrasi</TableHead><TableHead>Nomor Registrasi</TableHead><TableHead>Tanggal SPM</TableHead><TableHead>Nomor SPM</TableHead><TableHead>Nama SKPD</TableHead><TableHead>Uraian</TableHead><TableHead>Jumlah Kotor</TableHead><TableHead>Status Tagihan</TableHead><TableHead className="text-center">Aksi</TableHead>
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
                    </TableCell><TableCell className="font-medium">{tagihan.nomor_registrasi || '-'}</TableCell><TableCell>{tagihan.tanggal_spm ? format(parseISO(tagihan.tanggal_spm), 'dd MMM yyyy', { locale: localeId }) : '-'}</TableCell><TableCell className="font-medium">
                      <Tooltip>
                        <TooltipTrigger className="max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis block">
                          {tagihan.nomor_spm}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tagihan.nomor_spm}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell><TableCell className="relative group/skpd">
                      <div className="pr-8">{tagihan.nama_skpd}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover/skpd:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => handleCopySkpd(tagihan.nama_skpd, tagihan.id_tagihan)}
                        title="Salin nama SKPD"
                      >
                        {copiedId === tagihan.id_tagihan + '_skpd' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        )}
                      </Button>
                    </TableCell><TableCell className="min-w-[280px] relative group/uraian">
                      <div className="pr-8">{tagihan.uraian || '-'}</div>
                      {tagihan.uraian && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover/uraian:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => handleCopyUraian(tagihan.uraian, tagihan.id_tagihan)}
                          title="Salin uraian"
                        >
                          {copiedId === tagihan.id_tagihan ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          )}
                        </Button>
                      )}
                    </TableCell><TableCell className="relative group/jumlah">
                      <div className="pr-8">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover/jumlah:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => handleCopyJumlah(tagihan.jumlah_kotor, tagihan.id_tagihan)}
                        title="Salin jumlah kotor"
                      >
                        {copiedId === tagihan.id_tagihan + '_jumlah' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        )}
                      </Button>
                    </TableCell><TableCell><StatusBadge status={tagihan.status_tagihan} /></TableCell><TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Lihat Detail"
                        onClick={() => handleDetailClick(tagihan)}
                        className="hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
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
    </div>
  );
};

export default RiwayatRegistrasi;