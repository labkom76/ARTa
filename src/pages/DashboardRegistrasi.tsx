import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ClockIcon,
  CheckCircleIcon,
  ArrowLeftCircleIcon,
  TimerIcon,
  BarChart3Icon,
  PieChartIcon,
  ListOrderedIcon,
  HourglassIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, subDays, startOfDay, endOfDay, isSameDay, parseISO, differenceInMinutes } from 'date-fns';
import { id } from 'date-fns/locale';

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
  waktu_registrasi?: string;
  waktu_verifikasi?: string;
  id_pengguna_input: string;
}

interface KPIData {
  antrianSaatIni: number;
  diregistrasiHariIni: number;
  dikembalikanHariIni: number;
  waktuProsesRataRata: string;
}

interface BarChartDataItem {
  date: string;
  count: number;
}

interface PieChartDataItem {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666', '#66CCFF'];

const DashboardRegistrasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartDataItem[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]);
  const [oldestTagihan, setOldestTagihan] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || sessionLoading || profile?.peran !== 'Staf Registrasi') {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();

        // KPI 1: Antrian Saat Ini (Menunggu Registrasi)
        const { count: antrianCount, error: antrianError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Menunggu Registrasi');
        if (antrianError) throw antrianError;

        // KPI 2: Diregistrasi Hari Ini (status berubah menjadi Menunggu Verifikasi, dengan waktu_registrasi hari ini)
        const { count: registrasiTodayCount, error: registrasiTodayError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Menunggu Verifikasi')
          .gte('waktu_registrasi', todayStart)
          .lte('waktu_registrasi', todayEnd);
        if (registrasiTodayError) throw registrasiTodayError;

        // KPI 3: Dikembalikan Hari Ini (status 'Dikembalikan' dengan waktu_verifikasi hari ini)
        const { count: dikembalikanTodayCount, error: dikembalikanTodayError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Dikembalikan')
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);
        if (dikembalikanTodayError) throw dikembalikanTodayError;

        // KPI 4: Waktu Proses Rata-rata (waktu_registrasi - waktu_input)
        const { data: processedTagihan, error: processedError } = await supabase
          .from('database_tagihan')
          .select('waktu_input, waktu_registrasi')
          .not('waktu_registrasi', 'is', null); // Only consider tagihan that have been registered
        if (processedError) throw processedError;

        let totalProcessingMinutes = 0;
        let processedCount = 0;
        processedTagihan.forEach((tagihan) => {
          if (tagihan.waktu_input && tagihan.waktu_registrasi) {
            const inputDate = parseISO(tagihan.waktu_input);
            const registrasiDate = parseISO(tagihan.waktu_registrasi);
            const diff = differenceInMinutes(registrasiDate, inputDate);
            if (diff >= 0) { // Ensure positive difference
              totalProcessingMinutes += diff;
              processedCount++;
            }
          }
        });

        const averageProcessingTime = processedCount > 0 ? totalProcessingMinutes / processedCount : 0;
        const hours = Math.floor(averageProcessingTime / 60);
        const minutes = Math.round(averageProcessingTime % 60);
        const waktuProsesRataRataString = processedCount > 0
          ? `${hours} jam ${minutes} menit`
          : 'N/A';

        setKpiData({
          antrianSaatIni: antrianCount || 0,
          diregistrasiHariIni: registrasiTodayCount || 0,
          dikembalikanHariIni: dikembalikanTodayCount || 0,
          waktuProsesRataRata: waktuProsesRataRataString,
        });

        // Chart 1: Tren Tagihan Masuk (7 Hari Terakhir)
        const sevenDaysAgo = subDays(startOfDay(new Date()), 6).toISOString();
        const { data: recentTagihan, error: recentError } = await supabase
          .from('database_tagihan')
          .select('waktu_input')
          .gte('waktu_input', sevenDaysAgo);
        if (recentError) throw recentError;

        const dailyCounts: { [key: string]: number } = {};
        for (let i = 0; i < 7; i++) {
          const date = subDays(new Date(), 6 - i);
          dailyCounts[format(date, 'dd/MM', { locale: id })] = 0;
        }

        recentTagihan.forEach((tagihan) => {
          const dateKey = format(parseISO(tagihan.waktu_input), 'dd/MM', { locale: id });
          if (dailyCounts[dateKey] !== undefined) {
            dailyCounts[dateKey]++;
          }
        });
        setBarChartData(Object.keys(dailyCounts).map(date => ({ date, count: dailyCounts[date] })));

        // Chart 2: Komposisi Tagihan per SKPD
        const { data: allTagihanForPie, error: pieError } = await supabase
          .from('database_tagihan')
          .select('nama_skpd');
        if (pieError) throw pieError;

        const skpdCounts: { [key: string]: number } = {};
        allTagihanForPie.forEach((tagihan) => {
          skpdCounts[tagihan.nama_skpd] = (skpdCounts[tagihan.nama_skpd] || 0) + 1;
        });
        setPieChartData(Object.keys(skpdCounts).map(skpd => ({ name: skpd, value: skpdCounts[skpd] })));

        // Tabel Akses Cepat: 5 Tagihan Terlama di Antrian
        const { data: oldestQueue, error: oldestQueueError } = await supabase
          .from('database_tagihan')
          .select('*')
          .eq('status_tagihan', 'Menunggu Registrasi')
          .order('waktu_input', { ascending: true })
          .limit(5);
        if (oldestQueueError) throw oldestQueueError;
        setOldestTagihan(oldestQueue as Tagihan[]);

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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Dashboard Registrasi...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang mengambil data untuk Anda.</p>
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Registrasi</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Selamat datang, {profile?.nama_lengkap || user?.email}! Anda masuk sebagai {profile?.peran}.
      </p>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antrian Saat Ini</CardTitle>
            <HourglassIcon className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.antrianSaatIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan menunggu registrasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diregistrasi Hari Ini</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.diregistrasiHariIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan berhasil diregistrasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dikembalikan Hari Ini</CardTitle>
            <ArrowLeftCircleIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.dikembalikanHariIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan dikembalikan verifikator</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Waktu Proses Rata-rata</CardTitle>
            <TimerIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.waktuProsesRataRata}</div>
            <p className="text-xs text-muted-foreground">Waktu dari input hingga registrasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3Icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              Tren Tagihan Masuk (7 Hari Terakhir)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <PieChartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              Komposisi Tagihan per SKPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Table */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ListOrderedIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            5 Tagihan Terlama di Antrian
          </CardTitle>
        </CardHeader>
        <CardContent>
          {oldestTagihan.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan di antrian.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor SPM</TableHead>
                    <TableHead>SKPD</TableHead>
                    <TableHead className="min-w-[450px]">Uraian</TableHead> {/* Applied min-width */}
                    <TableHead>Waktu Input</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oldestTagihan.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell className="font-medium">{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell className="min-w-[450px]">{tagihan.uraian}</TableCell> {/* Applied min-width */}
                      <TableCell>{format(parseISO(tagihan.waktu_input), 'dd MMMM yyyy HH:mm', { locale: id })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardRegistrasi;