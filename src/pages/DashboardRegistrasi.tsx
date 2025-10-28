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
import { format, subDays, startOfDay, endOfDay, isSameDay, parseISO, differenceInMinutes, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Import Select components

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

// Define specific colors for each status for consistency in the bar chart
const STATUS_COLORS: { [key: string]: string } = {
  'Menunggu Registrasi': '#FFBB28', // Yellow
  'Menunggu Verifikasi': '#0088FE', // Blue
  'Diteruskan': '#00C49F', // Green
  'Dikembalikan': '#FF8042', // Orange
};

const DashboardRegistrasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartDataItem[]>([]);
  const [pieChartData, setPieChartData] = useState<PieChartDataItem[]>([]); // This state will now hold data for the Bar Chart
  const [oldestTagihan, setOldestTagihan] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);

  // New states for SKPD filter in chart
  const [selectedSkpdForChart, setSelectedSkpdForChart] = useState<string>('Semua SKPD');
  const [skpdOptionsForChart, setSkpdOptionsForChart] = useState<string[]>([]);

  // NEW: State for time range filter in chart
  const [selectedTimeRangeChart, setSelectedTimeRangeChart] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini'>('Bulan Ini');

  useEffect(() => {
    const fetchSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('nama_skpd')
          .order('nama_skpd', { ascending: true });

        if (error) throw error;

        const uniqueSkpd = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '');

        setSkpdOptionsForChart(['Semua SKPD', ...uniqueSkpd]);
      } catch (error: any) {
        console.error('Error fetching SKPD options for chart:', error.message);
        toast.error('Gagal memuat daftar SKPD untuk filter chart: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

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
        let compositionChartQuery = supabase
          .from('database_tagihan')
          .select('status_tagihan, waktu_input'); // Select waktu_input to filter by date

        if (selectedSkpdForChart !== 'Semua SKPD') {
          compositionChartQuery = compositionChartQuery.eq('nama_skpd', selectedSkpdForChart);
        }

        // Calculate date range based on selectedTimeRangeChart
        const now = new Date();
        let filterStartDate: Date;
        let filterEndDate: Date;

        switch (selectedTimeRangeChart) {
          case 'Hari Ini':
            filterStartDate = startOfDay(now);
            filterEndDate = endOfDay(now);
            break;
          case 'Minggu Ini':
            filterStartDate = startOfWeek(now, { locale: id }); // Week starts on Monday for 'id' locale
            filterEndDate = endOfWeek(now, { locale: id });
            break;
          case 'Bulan Ini':
            filterStartDate = startOfMonth(now);
            filterEndDate = endOfMonth(now);
            break;
          default:
            // Default to 'Bulan Ini' if somehow an unexpected value is selected
            filterStartDate = startOfMonth(now);
            filterEndDate = endOfMonth(now);
            break;
        }

        compositionChartQuery = compositionChartQuery
          .gte('waktu_input', filterStartDate.toISOString())
          .lte('waktu_input', filterEndDate.toISOString());

        const { data: tagihanStatusData, error: compositionError } = await compositionChartQuery;
        if (compositionError) throw compositionError;

        const statusCounts: { [key: string]: number } = {
          'Menunggu Registrasi': 0,
          'Menunggu Verifikasi': 0,
          'Diteruskan': 0,
          'Dikembalikan': 0,
        };

        tagihanStatusData.forEach((tagihan) => {
          if (statusCounts.hasOwnProperty(tagihan.status_tagihan)) {
            statusCounts[tagihan.status_tagihan]++;
          }
        });

        const newCompositionChartData = Object.keys(statusCounts).map(status => ({
          name: status,
          value: statusCounts[status],
        })).filter(item => item.value > 0); // Filter out statuses with 0 count for cleaner chart
        setPieChartData(newCompositionChartData); // Still using pieChartData state, but it will be rendered as a bar chart

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
  }, [user, profile, sessionLoading, selectedSkpdForChart, selectedTimeRangeChart]); // Add selectedTimeRangeChart to dependencies

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
          <CardHeader className="flex flex-row items-center justify-between"> {/* Added flex for alignment */}
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <PieChartIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              Komposisi Tagihan per SKPD
            </CardTitle>
            <div className="flex items-center space-x-2"> {/* Container for multiple selects */}
              {/* NEW: Time Range Select */}
              <Select onValueChange={(value: 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini') => setSelectedTimeRangeChart(value)} value={selectedTimeRangeChart}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Rentang Waktu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                  <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                  <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
                </SelectContent>
              </Select>
              {/* Existing SKPD Select */}
              <Select onValueChange={setSelectedSkpdForChart} value={selectedSkpdForChart}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih SKPD" />
                </SelectTrigger>
                <SelectContent>
                  {skpdOptionsForChart.map((skpd) => (
                    <SelectItem key={skpd} value={skpd}>
                      {skpd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}> {/* Added margin to PieChart */}
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80} // Reduced outerRadius to 80
                  innerRadius={60}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  paddingAngle={5}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#CCCCCC'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} tagihan`, name]} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 10 }} /> {/* Adjusted Legend position */}
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
                    <TableHead className="min-w-[280px]">Uraian</TableHead> {/* Applied min-width */}
                    <TableHead>Waktu Input</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oldestTagihan.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell className="font-medium">{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell className="min-w-[280px]">{tagihan.uraian}</TableCell> {/* Applied min-width */}
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