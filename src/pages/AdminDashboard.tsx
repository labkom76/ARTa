import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart, // Added
  Pie,      // Added
  Cell,     // Added
  Legend,   // Added
} from 'recharts';
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  CheckCircleIcon,
  HourglassIcon,
  DollarSignIcon,
  PieChartIcon, // Added
  BarChart3Icon, // Using this for bar chart toggle
} from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button'; // Added
import { useTheme } from 'next-themes'; // Added
import { cn } from '@/lib/utils'; // Added for conditional classNames

interface KPIData {
  totalSKPD: number;
  processedTagihanCount: number;
  totalAmountProcessed: number;
  queuedTagihan: number;
}

interface BarChartDataItem {
  name: string;
  value: number;
  // Removed 'color' property as it will be determined directly in the Bar component
}

const AdminDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [chartView, setChartView] = useState<'donut' | 'bar'>('donut'); // New state for chart view

  // State for filters
  const [processedStatusFilter, setProcessedStatusFilter] = useState<'Diteruskan' | 'Dikembalikan'>('Diteruskan');
  const [totalAmountTimeFilter, setTotalAmountTimeFilter] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini'>('Bulan Ini');
  const [selectedTimeRangeForChart, setSelectedTimeRangeForChart] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini'>('Bulan Ini'); // New state for chart time range

  const { theme } = useTheme(); // Get current theme

  // Define theme-aware color palettes
  const statusColorMap = {
    'Diteruskan': 0, // Green
    'Menunggu Registrasi': 1, // Yellow
    'Menunggu Verifikasi': 2, // Purple
    'Dikembalikan': 3, // Red
  };

  // New, more distinct color palettes
  const lightThemeChartColors = ['#22C55E', '#FACC15', '#A855F7', '#EF4444']; // Emerald, Yellow, Purple, Red
  const darkThemeChartColors = ['#4ADE80', '#FDE047', '#C084FC', '#F87171']; // Lighter Emerald, Yellow, Purple, Red

  const currentChartColors = theme === 'dark' ? darkThemeChartColors : lightThemeChartColors;

  // Text colors for chart elements
  const axisAndLabelColor = theme === 'dark' ? '#A0A0A0' : '#888888'; // Lighter grey for dark, darker for light
  const tooltipBgColor = theme === 'dark' ? '#333333' : '#FFFFFF';
  const tooltipTextColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const legendTextColor = theme === 'dark' ? '#E0E0E0' : '#333333';


  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const fetchDashboardData = async () => {
    if (!profile || profile.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();

      // 1. Total SKPD
      const { count: totalSKPDCount, error: skpdError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('peran', 'SKPD');
      if (skpdError) throw skpdError;

      // 2. Tagihan Diproses (Bulan Ini) - Filtered by processedStatusFilter
      const { count: processedTagihanCount, error: processedCountError } = await supabase
        .from('database_tagihan')
        .select('*', { count: 'exact', head: true })
        .eq('status_tagihan', processedStatusFilter)
        .gte('waktu_verifikasi', thisMonthStart)
        .lte('waktu_verifikasi', thisMonthEnd);
      if (processedCountError) throw processedCountError;

      // 3. Nilai Total Tagihan - Filtered by totalAmountTimeFilter (status always 'Diteruskan')
      let timeFilterStart: string;
      let timeFilterEnd: string;

      switch (totalAmountTimeFilter) {
        case 'Hari Ini':
          timeFilterStart = startOfDay(now).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        case 'Minggu Ini':
          timeFilterStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString(); // Monday as start of week
          timeFilterEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
          break;
        case 'Bulan Ini':
          timeFilterStart = startOfMonth(now).toISOString();
          timeFilterEnd = endOfMonth(now).toISOString();
          break;
        case 'Tahun Ini':
          timeFilterStart = startOfYear(now).toISOString();
          timeFilterEnd = endOfYear(now).toISOString();
          break;
        default:
          timeFilterStart = startOfMonth(now).toISOString();
          timeFilterEnd = endOfMonth(now).toISOString();
          break;
      }

      const { data: totalAmountData, error: totalAmountError } = await supabase
        .from('database_tagihan')
        .select('jumlah_kotor')
        .eq('status_tagihan', 'Diteruskan') // Always 'Diteruskan' for this card
        .gte('waktu_verifikasi', timeFilterStart)
        .lte('waktu_verifikasi', timeFilterEnd);
      if (totalAmountError) throw totalAmountError;

      const totalAmountProcessed = totalAmountData.reduce((sum, tagihan) => sum + (tagihan.jumlah_kotor || 0), 0);

      // 4. Tagihan Dalam Antrian
      const { count: queuedTagihanCount, error: queuedError } = await supabase
        .from('database_tagihan')
        .select('*', { count: 'exact', head: true })
        .in('status_tagihan', ['Menunggu Registrasi', 'Menunggu Verifikasi']);
      if (queuedError) throw queuedError;

      setKpiData({
        totalSKPD: totalSKPDCount || 0,
        processedTagihanCount: processedTagihanCount || 0,
        totalAmountProcessed: totalAmountProcessed,
        queuedTagihan: queuedTagihanCount || 0,
      });

      // Fetch data for Bar Chart
      const { data: tagihanStatusData, error: statusError } = await supabase
        .from('database_tagihan')
        .select('status_tagihan');
      if (statusError) throw statusError;

      const statusCounts: { [key: string]: number } = {
        'Menunggu Registrasi': 0,
        'Menunggu Verifikasi': 0,
        'Diteruskan': 0,
        'Dikembalikan': 0,
      };

      tagihanStatusData.forEach(tagihan => {
        if (statusCounts.hasOwnProperty(tagihan.status_tagihan)) {
          statusCounts[tagihan.status_tagihan]++;
        }
      });

      const dynamicBarChartData: BarChartDataItem[] = [
        { name: 'Menunggu Registrasi', value: statusCounts['Menunggu Registrasi'] },
        { name: 'Menunggu Verifikasi', value: statusCounts['Menunggu Verifikasi'] },
        { name: 'Diteruskan', value: statusCounts['Diteruskan'] },
        { name: 'Dikembalikan', value: statusCounts['Dikembalikan'] },
      ];
      setBarChartData(dynamicBarChartData);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error.message);
      toast.error('Gagal memuat data dashboard: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && profile?.peran === 'Administrator') {
      fetchDashboardData();
    }
  }, [sessionLoading, profile, processedStatusFilter, totalAmountTimeFilter, theme]); // Add theme to dependencies to re-fetch/re-render with new colors

  if (loadingPage || loadingData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Administrator</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Selamat datang, {profile?.nama_lengkap || 'Administrator'}! Ini adalah ringkasan aktivitas sistem.
      </p>

      {/* Kotak Informasi (Cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total SKPD Card */}
        <Card className="shadow-sm rounded-lg flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKPD</CardTitle>
            <UsersIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-end">
            <div className="text-2xl font-bold">{kpiData?.totalSKPD}</div>
            <p className="text-xs text-muted-foreground">Jumlah SKPD Terdaftar</p>
          </CardContent>
        </Card>

        {/* Tagihan Diproses (Bulan Ini) Card with filter */}
        <Card className="shadow-sm rounded-lg flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Diproses (Bulan Ini)</CardTitle>
            <div className="flex items-center gap-2">
              <Select onValueChange={(value: 'Diteruskan' | 'Dikembalikan') => setProcessedStatusFilter(value)} value={processedStatusFilter}>
                <SelectTrigger className="w-auto h-auto p-0 border-none shadow-none text-xs font-medium text-muted-foreground">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                  <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                </SelectContent>
              </Select>
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-end">
            <div className="text-2xl font-bold">{kpiData?.processedTagihanCount}</div>
            <p className="text-xs text-muted-foreground">Tagihan {processedStatusFilter.toLowerCase()} bulan ini</p>
          </CardContent>
        </Card>

        {/* Nilai Total Tagihan Card with filter */}
        <Card className="shadow-sm rounded-lg flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nilai Total Tagihan</CardTitle>
            <div className="flex items-center gap-2">
              <Select onValueChange={(value: 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini') => setTotalAmountTimeFilter(value)} value={totalAmountTimeFilter}>
                <SelectTrigger className="w-auto h-auto p-0 border-none shadow-none text-xs font-medium text-muted-foreground">
                  <SelectValue placeholder="Filter Waktu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                  <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                  <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
                  <SelectItem value="Tahun Ini">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
              <DollarSignIcon className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-end">
            <div className="text-2xl font-bold">Rp{kpiData?.totalAmountProcessed.toLocaleString('id-ID') || '0'}</div>
            <p className="text-xs text-muted-foreground">Jumlah kotor tagihan diteruskan</p>
          </CardContent>
        </Card>

        {/* Tagihan Dalam Antrian Card */}
        <Card className="shadow-sm rounded-lg flex flex-col h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Dalam Antrian</CardTitle>
            <HourglassIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="flex-grow flex flex-col justify-end">
            <div className="text-2xl font-bold">{kpiData?.queuedTagihan}</div>
            <p className="text-xs text-muted-foreground">Menunggu registrasi/verifikasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafik Batang (Bar Chart) */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <LayoutDashboardIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            Status Alur Kerja Langsung
          </CardTitle>
          <div className="flex items-center space-x-2">
            {/* New Dropdown for Time Range */}
            <Select onValueChange={(value: 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini') => setSelectedTimeRangeForChart(value)} value={selectedTimeRangeForChart}>
              <SelectTrigger className="w-[120px] h-auto p-2 text-xs font-medium">
                <SelectValue placeholder="Rentang Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
                <SelectItem value="Tahun Ini">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={chartView === 'bar' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setChartView('bar')}
              title="Tampilkan Bar Chart"
            >
              <BarChart3Icon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartView === 'donut' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setChartView('donut')}
              title="Tampilkan Donut Chart"
            >
              <PieChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {chartView === 'bar' ? (
              <BarChart data={barChartData}>
                <XAxis dataKey="name" stroke={axisAndLabelColor} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={axisAndLabelColor} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: tooltipBgColor, borderColor: axisAndLabelColor }}
                  itemStyle={{ color: tooltipTextColor }}
                  labelStyle={{ color: tooltipTextColor }}
                />
                <Legend wrapperStyle={{ color: legendTextColor }} />
                <Bar
                  dataKey="value"
                  fill={({ name }) => currentChartColors[statusColorMap[name as keyof typeof statusColorMap]]}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={barChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={60} // For donut effect
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  paddingAngle={5}
                >
                  {barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={currentChartColors[statusColorMap[entry.name as keyof typeof statusColorMap]]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value.toLocaleString('id-ID')}`, name]}
                  contentStyle={{ backgroundColor: tooltipBgColor, borderColor: axisAndLabelColor }}
                  itemStyle={{ color: tooltipTextColor }}
                  labelStyle={{ color: tooltipTextColor }}
                />
                <Legend wrapperStyle={{ color: legendTextColor }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;