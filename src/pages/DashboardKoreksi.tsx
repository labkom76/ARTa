import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { HourglassIcon, RotateCcwIcon, CheckCircleIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  nomor_koreksi?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
}

interface KPIData {
  antrianBersama: number;
  dikembalikanHariIni: number;
  totalDiprosesBulanIni: number;
}

const DashboardKoreksi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [latestCorrections, setLatestCorrections] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || sessionLoading || profile?.peran !== 'Staf Koreksi') {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        const thisMonthStart = startOfMonth(new Date()).toISOString();
        const thisMonthEnd = endOfMonth(new Date()).toISOString();

        // KPI 1: Antrian Bersama (Menunggu Verifikasi)
        const { count: antrianCount, error: antrianError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Menunggu Verifikasi');
        if (antrianError) throw antrianError;

        // KPI 2: Tagihan Dikembalikan oleh Saya (Hari Ini)
        const { count: dikembalikanHariIniCount, error: dikembalikanHariIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('id_korektor', user.id)
          .gte('waktu_koreksi', todayStart)
          .lte('waktu_koreksi', todayEnd);
        if (dikembalikanHariIniError) throw dikembalikanHariIniError;

        // KPI 3: Total Diproses oleh Saya (Bulan Ini)
        const { count: totalDiprosesBulanIniCount, error: totalDiprosesBulanIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('id_korektor', user.id)
          .gte('waktu_koreksi', thisMonthStart)
          .lte('waktu_koreksi', thisMonthEnd);
        if (totalDiprosesBulanIniError) throw totalDiprosesBulanIniError;

        setKpiData({
          antrianBersama: antrianCount || 0,
          dikembalikanHariIni: dikembalikanHariIniCount || 0,
          totalDiprosesBulanIni: totalDiprosesBulanIniCount || 0,
        });

        // Tabel Riwayat: 5 Tagihan Terakhir yang Dikoreksi oleh Saya
        const { data: correctionsData, error: correctionsError } = await supabase
          .from('database_tagihan')
          .select('waktu_koreksi, nomor_koreksi, nomor_spm, nama_skpd, catatan_koreksi')
          .eq('id_korektor', user.id)
          .order('waktu_koreksi', { ascending: false })
          .limit(5);
        if (correctionsError) throw correctionsError;

        setLatestCorrections(correctionsData as Tagihan[]);

      } catch (error: any) {
        console.error('Error fetching dashboard data:', error.message);
        toast.error('Gagal memuat data dashboard: ' + error.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, profile, sessionLoading]);

  if (sessionLoading || loadingData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Dashboard Koreksi...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang mengambil data untuk Anda.</p>
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Koreksi</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Selamat Datang, {profile?.nama_lengkap || user?.email}!
      </p>

      {/* Kerangka Kotak Informasi */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antrian Bersama</CardTitle>
            <HourglassIcon className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.antrianBersama}</div>
            <p className="text-xs text-muted-foreground">Tagihan menunggu verifikasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Dikembalikan oleh Saya (Hari Ini)</CardTitle>
            <RotateCcwIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.dikembalikanHariIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan yang Anda kembalikan hari ini</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Diproses oleh Saya (Bulan Ini)</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.totalDiprosesBulanIni}</div>
            <p className="text-xs text-muted-foreground">Total tagihan yang Anda koreksi bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Kerangka Tabel Riwayat */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">Pengembalian Tagihan Terakhir Anda</CardTitle>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestCorrections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Tidak ada data pengembalian tagihan.
                    </TableCell>
                  </TableRow>
                ) : (
                  latestCorrections.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell>
                        {tagihan.waktu_koreksi ? format(parseISO(tagihan.waktu_koreksi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{tagihan.nomor_koreksi || '-'}</TableCell>
                      <TableCell>{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell>{tagihan.catatan_koreksi || '-'}</TableCell>
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

export default DashboardKoreksi;