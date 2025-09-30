import React, { useEffect, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'; // Import startOfDay and endOfDay
import { id as localeId } from 'date-fns/locale';
import { EyeIcon, PrinterIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useDebounce from '@/hooks/use-debounce';
import { DateRange } from 'react-day-picker'; // Import DateRange type
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets'; // Import the DateRangePicker component

interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  nomor_koreksi?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
}

const RekapDikembalikan = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // New state for date range

  useEffect(() => {
    const fetchRekapDikembalikan = async () => {
      if (!user || sessionLoading || profile?.peran !== 'Staf Koreksi') {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        let query = supabase
          .from('database_tagihan')
          .select('id_tagihan, nama_skpd, nomor_spm, nomor_koreksi, waktu_koreksi, catatan_koreksi')
          .eq('id_korektor', user.id)
          .order('waktu_koreksi', { ascending: false });

        if (debouncedSearchQuery) {
          query = query.or(
            `nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%`
          );
        }

        // Apply date range filter
        if (dateRange?.from) {
          query = query.gte('waktu_koreksi', startOfDay(dateRange.from).toISOString());
        }
        if (dateRange?.to) {
          query = query.lte('waktu_koreksi', endOfDay(dateRange.to).toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        setTagihanList(data as Tagihan[]);
      } catch (error: any) {
        console.error('Error fetching rekap dikembalikan:', error.message);
        toast.error('Gagal memuat rekap tagihan dikembalikan: ' + error.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchRekapDikembalikan();
  }, [user, profile, sessionLoading, debouncedSearchQuery, dateRange]); // Add dateRange to dependencies

  if (sessionLoading || loadingData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Koreksi') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Rekap Tagihan Dikembalikan</h1>

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
                type="text"
                placeholder="Cari berdasarkan Nomor SPM atau Nama SKPD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Tabel Riwayat */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Tagihan Dikembalikan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu Koreksi</TableHead>
                  <TableHead>Nomor Koreksi</TableHead>
                  <TableHead>Nomor SPM</TableHead>
                  <TableHead>Nama SKPD</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagihanList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Tidak ada data tagihan dikembalikan.
                    </TableCell>
                  </TableRow>
                ) : (
                  tagihanList.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell>
                        {tagihan.waktu_koreksi ? format(parseISO(tagihan.waktu_koreksi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{tagihan.nomor_koreksi || '-'}</TableCell>
                      <TableCell>{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell>{tagihan.catatan_koreksi || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="icon" title="Lihat Detail">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" title="Cetak">
                            <PrinterIcon className="h-4 w-4" />
                          </Button>
                        </div>
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

export default RekapDikembalikan;