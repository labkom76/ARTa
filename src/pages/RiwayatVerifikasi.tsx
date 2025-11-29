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
import { SearchIcon, EyeIcon, PrinterIcon, FileDownIcon, ClockIcon, Sparkles, FilterIcon } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/StatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Combobox } from '@/components/ui/combobox';
import * as XLSX from 'xlsx';

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

interface SkpdOption {
  value: string;
  label: string;
}

const RiwayatVerifikasi = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [selectedVerifierId, setSelectedVerifierId] = useState<string>('Semua Verifikator');
  const [verifierOptions, setVerifierOptions] = useState<VerifierOption[]>([]);

  const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
  const [skpdOptions, setSkpdOptions] = useState<SkpdOption[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  const prevSearchQuery = React.useRef(searchQuery);
  const prevSelectedStatus = React.useRef(selectedStatus);
  const prevDateRange = React.useRef(dateRange);
  const prevItemsPerPage = React.useRef(itemsPerPage);
  const prevCurrentPage = React.useRef(currentPage);
  const prevSelectedVerifierId = React.useRef(selectedVerifierId);
  const prevSelectedSkpd = React.useRef(selectedSkpd);

  const searchInputRef = useRef<HTMLInputElement>(null);

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
        setLoadingData(true);
      } else {
        setLoadingPagination(true);
      }

      try {
        let query = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .order('waktu_verifikasi', { ascending: false });

        query = query.in('status_tagihan', ['Diteruskan', 'Dikembalikan']);

        if (profile?.peran === 'Staf Verifikator') {
          query = query.is('id_korektor', null);
        }

        if (debouncedSearchQuery) {
          query = query.or(
            `nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`
          );
        }

        if (selectedStatus !== 'Semua Status') {
          query = query.eq('status_tagihan', selectedStatus);
        }

        if (dateRange?.from) {
          query = query.gte('waktu_verifikasi', startOfDay(dateRange.from).toISOString());
        }
        if (dateRange?.to) {
          query = query.lte('waktu_verifikasi', endOfDay(dateRange.to).toISOString());
        }

        if (selectedVerifierId !== 'Semua Verifikator') {
          const verifierName = verifierOptions.find(opt => opt.value === selectedVerifierId)?.label;
          if (verifierName) {
            query = query.eq('nama_verifikator', verifierName);
          }
        }

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
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === searchQuery &&
      prevSelectedStatus.current === selectedStatus &&
      prevDateRange.current === dateRange &&
      prevItemsPerPage.current === itemsPerPage &&
      prevSelectedVerifierId.current === selectedVerifierId &&
      prevSelectedSkpd.current === selectedSkpd
    ) {
      isPaginationOnlyChange = true;
    }

    fetchRiwayatVerifikasi(isPaginationOnlyChange);

    prevSearchQuery.current = searchQuery;
    prevSelectedStatus.current = selectedStatus;
    prevDateRange.current = dateRange;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;
    prevSelectedVerifierId.current = selectedVerifierId;
    prevSelectedSkpd.current = selectedSkpd;

  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, dateRange, currentPage, itemsPerPage, selectedVerifierId, selectedSkpd, verifierOptions, skpdOptions]);

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

  const handleExportToXLSX = () => {
    if (tagihanList.length === 0) {
      toast.info('Tidak ada data tagihan untuk diekspor.');
      return;
    }

    const dataToExport = tagihanList.map(tagihan => ({
      'Waktu Verifikasi': tagihan.waktu_verifikasi ? format(parseISO(tagihan.waktu_verifikasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-',
      'Nomor Verifikasi': tagihan.nomor_verifikasi || '-',
      'Nama SKPD': tagihan.nama_skpd,
      'Nomor SPM': tagihan.nomor_spm,
      'Jenis SPM': tagihan.jenis_spm,
      'Jenis Tagihan': tagihan.jenis_tagihan,
      'Uraian': tagihan.uraian,
      'Jumlah Kotor': tagihan.jumlah_kotor,
      'Status Akhir': tagihan.status_tagihan,
      'Diperiksa oleh': tagihan.nama_verifikator || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Verifikasi");
    XLSX.writeFile(wb, "riwayat_verifikasi.xlsx");

    toast.success('Data riwayat verifikasi berhasil diekspor ke XLSX!');
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
              Memuat Riwayat Verifikasi
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sedang memeriksa hak akses dan mengambil data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Verifikator' && profile?.peran !== 'Administrator') {
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
      {/* Header with gradient title */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
              <ClockIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              Riwayat Verifikasi Tagihan
            </h1>
            <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Lihat riwayat tagihan yang sudah diverifikasi
            </p>
          </div>
          <Button variant="outline" className="flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" onClick={handleExportToXLSX}>
            <FileDownIcon className="h-4 w-4" /> Export ke XLSX
          </Button>
        </div>
      </div>

      {/* Filter Panel - Separate Card */}
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200 dark:border-emerald-900/30">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
            <FilterIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
              className="pl-9 w-full focus-visible:ring-emerald-500"
            />
          </div>
          <Select onValueChange={(value) => { setSelectedStatus(value); setCurrentPage(1); }} value={selectedStatus}>
            <SelectTrigger className="w-full sm:w-[200px] focus:ring-emerald-500">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua Status">Semua Status</SelectItem>
              <SelectItem value="Diteruskan">Diteruskan</SelectItem>
              <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => { setSelectedVerifierId(value); setCurrentPage(1); }} value={selectedVerifierId}>
            <SelectTrigger className="w-full sm:w-[200px] focus:ring-emerald-500">
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
        <div className="mb-4 flex items-center justify-end space-x-2">
          <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
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

        <div className="overflow-x-auto">
          <Table><TableHeader><TableRow>
            <TableHead className="w-[50px]">No.</TableHead><TableHead>Waktu Verifikasi</TableHead><TableHead>Nomor Verifikasi</TableHead><TableHead>Nama SKPD</TableHead><TableHead>Nomor SPM</TableHead><TableHead>Jumlah Kotor</TableHead><TableHead>Status Akhir</TableHead><TableHead>Diperiksa oleh</TableHead><TableHead className="text-center">Aksi</TableHead>
          </TableRow></TableHeader><TableBody>
              {loadingData && !loadingPagination ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Memuat data riwayat verifikasi...
                  </TableCell>
                </TableRow>
              ) : tagihanList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Tidak ada data riwayat verifikasi.
                  </TableCell>
                </TableRow>
              ) : (
                tagihanList.map((tagihan, index) => (
                  <TableRow key={tagihan.id_tagihan}>
                    <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell><TableCell>
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
                      <div className="flex justify-center space-x-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Lihat Detail"
                          onClick={() => handleDetailClick(tagihan)}
                          className="hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <EyeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cetak"
                          onClick={() => handlePrintClick(tagihan.id_tagihan)}
                          className="hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          <PrinterIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </Button>
                      </div>
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
    </div >
  );
};

export default RiwayatVerifikasi;