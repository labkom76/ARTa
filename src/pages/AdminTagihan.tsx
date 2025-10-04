import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext'; // Corrected import path
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EyeIcon, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'; // Import startOfDay and endOfDay
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
import { DateRange } from 'react-day-picker'; // Import DateRange type
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets'; // Import DateRangePickerWithPresets

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
}

const AdminTagihan = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [skpdOptions, setSkpdOptions] = useState<string[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // New state for date range

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
          .from('database_tagihan')
          .select('nama_skpd');

        if (error) throw error;

        const uniqueSkpd = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '');

        setSkpdOptions(['Semua SKPD', ...uniqueSkpd.sort()]);
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

  const fetchTagihan = async () => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      let query = supabase
        .from('database_tagihan')
        .select('*')
        .order('waktu_input', { ascending: false });

      if (debouncedSearchQuery) {
        query = query.or(
          `nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`
        );
      }

      // Apply status filter if not 'Semua Status'
      if (selectedStatus !== 'Semua Status') {
        query = query.eq('status_tagihan', selectedStatus);
      }

      // Apply SKPD filter if not 'Semua SKPD'
      if (selectedSkpd !== 'Semua SKPD') {
        query = query.eq('nama_skpd', selectedSkpd);
      }

      // Apply date range filter
      if (dateRange?.from) {
        query = query.gte('waktu_input', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('waktu_input', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setTagihanList(data as Tagihan[]);
    } catch (error: any) {
      console.error('Error fetching tagihan:', error.message);
      toast.error('Gagal memuat daftar tagihan: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, selectedSkpd, dateRange]); // Add dateRange to dependencies

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  if (loadingPage) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Seluruh Tagihan</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Lihat dan kelola semua tagihan yang ada dalam sistem.
      </p>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1 w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan Nomor SPM atau Nama SKPD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Select onValueChange={setSelectedStatus} value={selectedStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
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
            <Select onValueChange={setSelectedSkpd} value={selectedSkpd}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter SKPD" />
              </SelectTrigger>
              <SelectContent>
                {skpdOptions.map((skpd) => (
                  <SelectItem key={skpd} value={skpd}>
                    {skpd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePickerWithPresets
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full sm:w-auto"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Tagihan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu Input</TableHead>
                  <TableHead>Nomor SPM</TableHead>
                  <TableHead>Nama SKPD</TableHead>
                  <TableHead>Jumlah Kotor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperiksa oleh</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Memuat data tagihan...
                    </TableCell>
                  </TableRow>
                ) : tagihanList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Tidak ada data tagihan.
                    </TableCell>
                  </TableRow>
                ) : (
                  tagihanList.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell>{formatDate(tagihan.waktu_input)}</TableCell>
                      <TableCell className="font-medium">{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                      <TableCell>{tagihan.status_tagihan}</TableCell>
                      <TableCell>{tagihan.nama_verifikator || tagihan.nama_registrator || tagihan.id_korektor ? (tagihan.nama_verifikator || tagihan.nama_registrator || 'Staf Koreksi') : '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="outline" size="icon" title="Lihat Detail">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTagihan;