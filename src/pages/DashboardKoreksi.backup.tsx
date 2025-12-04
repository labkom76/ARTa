import React, { useEffect, useState, useMemo } from 'react';
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
import { HourglassIcon, RotateCcwIcon, CheckCircleIcon, ClipboardListIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

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

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  // Typing animation texts
  const typingTexts = useMemo(() => [
    `Selamat datang ${profile?.nama_lengkap || 'Staf'}! Siap memproses tagihan hari ini?`,
    `${greeting}, tetap semangat yaa!!`
  ], [greeting, profile?.nama_lengkap]);

  const animatedText = useTypingAnimation(typingTexts, 80, 40, 3000);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Memuat Dashboard
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sedang mengambil data untuk Anda...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Koreksi') {
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
      {/* Header with Animated Text */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
          <ClipboardListIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          Selamat Datang, {profile?.nama_lengkap || 'Staf'}!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span className="inline-flex items-center">
            {animatedText}
            <span className="inline-block w-0.5 h-5 bg-emerald-500 ml-1 animate-pulse"></span>
          </span>
        </p>
      </div>

      {/* KPI Cards with Full Gradient Background */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card 1: Antrian Bersama */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Antrian Bersama</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <HourglassIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.antrianBersama}
            </div>
            <p className="text-xs text-white/80">
              Tagihan menunggu verifikasi
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Dikembalikan Hari Ini */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Dikembalikan Hari Ini</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <RotateCcwIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.dikembalikanHariIni}
            </div>
            <p className="text-xs text-white/80">
              Tagihan yang Anda kembalikan hari ini
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Diproses Bulan Ini */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Diproses Bulan Ini</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.totalDiprosesBulanIni}
            </div>
            <p className="text-xs text-white/80">
              Total tagihan yang Anda koreksi bulan ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Corrections Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <ClipboardListIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Pengembalian Tagihan Terakhir Anda
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Waktu Koreksi</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nomor Koreksi</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nomor SPM</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nama SKPD</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestCorrections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                          <ClipboardListIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tidak ada data pengembalian tagihan</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Riwayat koreksi akan muncul di sini</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  latestCorrections.map((tagihan, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {tagihan.waktu_koreksi ? format(parseISO(tagihan.waktu_koreksi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{tagihan.nomor_koreksi || '-'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{tagihan.nomor_spm}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{tagihan.nama_skpd}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{tagihan.catatan_koreksi || '-'}</TableCell>
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