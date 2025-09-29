import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  HourglassIcon,
  CheckCircleIcon,
  RotateCcwIcon,
  TimerIcon,
  BarChart3Icon,
  BarChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface KPIData {
  antrianVerifikasi: number;
  diverifikasiHariIni: number;
  tingkatPengembalianBulanIni: string;
  waktuVerifikasiRataRata: string;
}

interface DailyVerificationData {
  date: string;
  diteruskan: number;
  dikembalikan: number;
}

interface SkpdProblemData {
  name: string;
  value: number;
}

const DashboardVerifikasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [dailyVerificationChartData, setDailyVerificationChartData] = useState<DailyVerificationData[]>([]);
  const [skpdProblemChartData, setSkpdProblemChartData] = useState<SkpdProblemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || sessionLoading || profile?.peran !== 'Staf Verifikator') {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const today = new Date();
        const todayStart = startOfDay(today).toISOString();
        const todayEnd = endOfDay(today).toISOString();
        const thisMonthStart = startOfMonth(today).toISOString();
        const thisMonthEnd = endOfMonth(today).toISOString();
        const thirtyDaysAgo = subDays(startOfDay(today), 29).toISOString();

        // KPI 1: Antrian Verifikasi
        const { count: antrianVerifikasiCount, error: antrianError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Menunggu Verifikasi');
        if (antrianError) throw antrianError;

        // KPI 2: Diverifikasi Hari Ini
        const { count: diverifikasiHariIniCount, error: diverifikasiHariIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);
        if (diverifikasiHariIniError) throw diverifikasiHariIniError;

        // KPI 3: Tingkat Pengembalian (Bulan Ini)
        const { count: totalVerifikasiBulanIni, error: totalVerifikasiBulanIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .gte('waktu_verifikasi', thisMonthStart)
          .lte('waktu_verifikasi', thisMonthEnd);
        if (totalVerifikasiBulanIniError) throw totalVerifikasiBulanIniError;

        const { count: dikembalikanBulanIni, error: dikembalikanBulanIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Dikembalikan')
          .gte('waktu_verifikasi', thisMonthStart)
          .lte('waktu_verifikasi', thisMonthEnd);
        if (dikembalikanBulanIniError) throw dikembalikanBulanIniError;

        const tingkatPengembalian = totalVerifikasiBulanIni > 0
          ? ((dikembalikanBulanIni || 0) / totalVerifikasiBulanIni) * 100
          : 0;

        // KPI 4: Waktu Verifikasi Rata-rata
        const { data: processedTagihan, error: processedError } = await supabase
          .from('database_tagihan')
          .select('waktu_registrasi, waktu_verifikasi')
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .not('waktu_registrasi', 'is', null)
          .not('waktu_verifikasi', 'is', null);
        if (processedError) throw processedError;

        let totalProcessingMinutes = 0;
        let processedCount = 0;
        processedTagihan.forEach((tagihan) => {
          if (tagihan.waktu_registrasi && tagihan.waktu_verifikasi) {
            const registrasiDate = parseISO(tagihan.waktu_registrasi);
            const verifikasiDate = parseISO(tagihan.waktu_verifikasi);
            const diff = differenceInMinutes(verifikasiDate, registrasiDate);
            if (diff >= 0) {
              totalProcessingMinutes += diff;
              processedCount++;
            }
          }
        });

        const averageProcessingTime = processedCount > 0 ? totalProcessingMinutes / processedCount : 0;
        const hours = Math.floor(averageProcessingTime / 60);
        const minutes = Math.round(averageProcessingTime % 60);
        const waktuVerifikasiRataRataString = processedCount > 0
          ? `${hours} jam ${minutes} menit`
          : 'N/A';

        setKpiData({
          antrianVerifikasi: antrianVerifikasiCount || 0,
          diverifikasiHariIni: diverifikasiHariIniCount || 0,
          tingkatPengembalianBulanIni: `${tingkatPengembalian.toFixed(2)}%`,
          waktuVerifikasiRataRata: waktuVerifikasiRataRataString,
        });

        // Chart 1: Hasil Verifikasi (30 Hari Terakhir)
        const { data: recentVerifications, error: recentVerificationsError } = await supabase
          .from('database_tagihan')
          .select('status_tagihan, waktu_verifikasi')
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .gte('waktu_verifikasi', thirtyDaysAgo);
        if (recentVerificationsError) throw recentVerificationsError;

        const dailyData: { [key: string]: { diteruskan: number; dikembalikan: number } } = {};
        for (let i = 0; i < 30; i++) {
          const date = subDays(today, 29 - i);
          dailyData[format(date, 'dd/MM', { locale: localeId })] = { diteruskan: 0, dikembalikan: 0 };
        }

        recentVerifications.forEach((item) => {
          if (item.waktu_verifikasi) {
            const dateKey = format(parseISO(item.waktu_verifikasi), 'dd/MM', { locale: localeId });
            if (dailyData[dateKey]) {
              if (item.status_tagihan === 'Diteruskan') {
                dailyData[dateKey].diteruskan++;
              } else if (item.status_tagihan === 'Dikembalikan') {
                dailyData[dateKey].dikembalikan++;
              }
            }
          }
        });
        setDailyVerificationChartData(Object.keys(dailyData).map(date => ({ date, ...dailyData[date] })));

        // Chart 2: Sumber Tagihan Bermasalah (per SKPD)
        const { data: returnedTagihan, error: returnedTagihanError } = await supabase
          .from('database_tagihan')
          .select('nama_skpd')
          .eq('status_tagihan', 'Dikembalikan');
        if (returnedTagihanError) throw returnedTagihanError;

        const skpdReturnCounts: { [key: string]: number } = {};
        returnedTagihan.forEach((tagihan) => {
          if (tagihan.nama_skpd) {
            skpdReturnCounts[tagihan.nama_skpd] = (skpdReturnCounts[tagihan.nama_skpd] || 0) + 1;
          }
        });

        const sortedSkpd = Object.entries(skpdReturnCounts)
          .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
        setSkpdProblemChartData(sortedSkpd);

      } catch (error: any) {
        console.error('Error fetching dashboard data:', error.message);
        toast.error('Gagal memuat data dashboard: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Dashboard Verifikasi...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang mengambil data untuk Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Verifikator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Verifikasi</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Selamat datang, {profile?.nama_lengkap || user?.email}! Anda masuk sebagai {profile?.peran}.
      </p>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antrian Verifikasi</CardTitle>
            <HourglassIcon className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.antrianVerifikasi}</div>
            <p className="text-xs text-muted-foreground">Tagihan menunggu verifikasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diverifikasi Hari Ini</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.diverifikasiHariIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan berhasil diverifikasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tingkat Pengembalian (Bulan Ini)</CardTitle>
            <RotateCcwIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.tingkatPengembalianBulanIni}</div>
            <p className="text-xs text-muted-foreground">Dari total verifikasi bulan ini</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waktu Verifikasi Rata-rata</CardTitle>
            <TimerIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.waktuVerifikasiRataRata}</div>
            <p className="text-xs text-muted-foreground">Waktu dari registrasi hingga verifikasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              Hasil Verifikasi (30 Hari Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyVerificationChartData}>
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="diteruskan" fill="#82ca9d" name="Diteruskan" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dikembalikan" fill="#ff7300" name="Dikembalikan" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BarChartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              Sumber Tagihan Bermasalah (per SKPD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skpdProblemChartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Jumlah Dikembalikan" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardVerifikasi;