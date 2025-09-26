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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchIcon, EyeIcon } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'; // Import startOfDay and endOfDay
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
import { DateRange } from 'react-day-picker'; // Import DateRange type
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets'; // Import the new component

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
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // New state for date range

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  useEffect(() => {
    const fetchRiwayatRegistrasi = async () => {
      if (sessionLoading || profile?.peran !== 'Staf Registrasi') {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        let query = supabase
          .from('database_tagihan')
          .select('*')
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

        // Tambahkan filter rentang tanggal
        if (dateRange?.from) {
          query = query.gte('waktu_registrasi', startOfDay(dateRange.from).toISOString());
        }
        if (dateRange?.to) {
          query = query.lte('waktu_registrasi', endOfDay(dateRange.to).toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        setTagihanList(data as Tagihan[]);
      } catch (error: any) {
        console.error('Error fetching riwayat registrasi:', error.message);
        toast.error('Gagal memuat riwayat registrasi: ' + error.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchRiwayatRegistrasi();
  }, [sessionLoading, profile, debouncedSearchQuery, selectedStatus, dateRange]); // Tambahkan dateRange sebagai dependency

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

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
            <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
            <SelectItem value="Diteruskan">Diteruskan</SelectItem>
            <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
          </SelectContent>
        </Select>
        <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu Registrasi</TableHead>
              <TableHead>Nomor Registrasi</TableHead>
              <TableHead>Nomor SPM</TableHead>
              <TableHead>Nama SKPD</TableHead>
              <TableHead>Jumlah Kotor</TableHead>
              <TableHead>Status Tagihan</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tagihanList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Tidak ada data riwayat registrasi.
                </TableCell>
              </TableRow>
            ) : (
              tagihanList.map((tagihan) => (
                <TableRow key={tagihan.id_tagihan}>
                  <TableCell>
                    {tagihan.waktu_registrasi ? format(parseISO(tagihan.waktu_registrasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                  </TableCell>
                  <TableCell className="font-medium">{tagihan.nomor_registrasi || '-'}</TableCell>
                  <TableCell>{tagihan.nomor_spm}</TableCell>
                  <TableCell>{tagihan.nama_skpd}</TableCell>
                  <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                  <TableCell>{tagihan.status_tagihan}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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