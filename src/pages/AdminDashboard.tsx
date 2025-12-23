import React, { useEffect, useState, useCallback } from 'react';
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  LayoutDashboardIcon,
  UsersIcon,
  FileTextIcon,
  CheckCircleIcon,
  HourglassIcon,
  DollarSignIcon,
  PieChartIcon,
  BarChart3Icon,
  TrendingUpIcon,
  ActivityIcon,
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
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface KPIData {
  totalSKPD: number;
  newUsersPendingActivation: number; // Mengganti processedTagihanCount
  totalAmountProcessed: number;
  queuedTagihan: number;
}

interface BarChartDataItem {
  name: string;
  value: number;
}

interface VerifikatorStats {
  nama_verifikator: string;
  total_tagihan: number;
  percentage: number;
}

interface SkpdStats {
  nama_skpd: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

const AdminDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [chartView, setChartView] = useState<'donut' | 'bar'>('donut');

  // State for filters (processedStatusFilter no longer needed for KPI, but kept for consistency if other parts use it)
  const [processedStatusFilter, setProcessedStatusFilter] = useState<'Diteruskan' | 'Dikembalikan'>('Diteruskan');
  const [totalAmountTimeFilter, setTotalAmountTimeFilter] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini'>('Bulan Ini');
  const [selectedTimeRangeForChart, setSelectedTimeRangeForChart] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini'>('Bulan Ini');

  // State for Top 5 Verifikator
  const [topVerifikatorData, setTopVerifikatorData] = useState<VerifikatorStats[]>([]);
  const [topVerifikatorTimeFilter, setTopVerifikatorTimeFilter] = useState<'Hari Ini' | '7 Hari Terakhir' | '30 Hari Terakhir'>('30 Hari Terakhir');

  // State for Top 10 SKPD
  const [topSkpdData, setTopSkpdData] = useState<SkpdStats[]>([]);
  const [topSkpdTimeFilter, setTopSkpdTimeFilter] = useState<'Hari Ini' | '7 Hari Terakhir' | '30 Hari Terakhir'>('30 Hari Terakhir');
  const [topSkpdCurrentPage, setTopSkpdCurrentPage] = useState(1);
  const topSkpdItemsPerPage = 5;

  const { theme } = useTheme();

  const statusColorMap = {
    'Diteruskan': 0, // Emerald
    'Menunggu Registrasi': 1, // Amber
    'Menunggu Verifikasi': 2, // Blue
    'Dikembalikan': 3, // Red
  };

  // Emerald-themed chart colors
  const lightThemeChartColors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const darkThemeChartColors = ['#34d399', '#fbbf24', '#60a5fa', '#f87171'];

  const currentChartColors = theme === 'dark' ? darkThemeChartColors : lightThemeChartColors;

  const axisAndLabelColor = theme === 'dark' ? '#94a3b8' : '#64748b';
  const tooltipBgColor = theme === 'dark' ? '#1e293b' : '#ffffff';
  const tooltipTextColor = theme === 'dark' ? '#f1f5f9' : '#0f172a';
  const legendTextColor = theme === 'dark' ? '#e2e8f0' : '#334155';


  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  // Function to fetch KPI data
  const fetchKpiData = useCallback(async () => {
    if (!profile || profile.peran !== 'Administrator') {
      return;
    }

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

      // 2. Pengguna Baru Menunggu Aktivasi (peran SKPD dan asal_skpd IS NULL)
      const { count: newUsersCount, error: newUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('peran', 'SKPD')
        .is('asal_skpd', null); // Filter for users with SKPD role but no assigned SKPD
      if (newUsersError) throw newUsersError;

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
        newUsersPendingActivation: newUsersCount || 0, // Menggunakan data pengguna baru
        totalAmountProcessed: totalAmountProcessed,
        queuedTagihan: queuedTagihanCount || 0,
      });
    } catch (error: any) {
      console.error('Error fetching KPI data:', error.message);
      toast.error('Gagal memuat data KPI: ' + error.message);
    }
  }, [profile, totalAmountTimeFilter]); // processedStatusFilter removed from dependencies as it's no longer used here

  // Function to fetch chart data using Edge Function
  const fetchChartData = useCallback(async () => {
    if (!profile || profile.peran !== 'Administrator') {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: JSON.stringify({
          reportType: 'status_workflow',
          timeRange: selectedTimeRangeForChart,
        }),
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      setBarChartData(data || []);
    } catch (error: any) {
      console.error('Error fetching chart data:', error.message);
      toast.error('Gagal memuat data chart: ' + error.message);
      setBarChartData([]);
    }
  }, [profile, selectedTimeRangeForChart]);

  // Function to fetch Top 5 Verifikator data
  const fetchTopVerifikator = useCallback(async () => {
    if (!profile || profile.peran !== 'Administrator') {
      return;
    }

    try {
      const now = new Date();
      let timeFilterStart: string;
      let timeFilterEnd: string;

      switch (topVerifikatorTimeFilter) {
        case 'Hari Ini':
          timeFilterStart = startOfDay(now).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        case '7 Hari Terakhir':
          // Last 7 days including today
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 6); // -6 because today counts as day 1
          timeFilterStart = startOfDay(sevenDaysAgo).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        case '30 Hari Terakhir':
          // Last 30 days including today
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 29); // -29 because today counts as day 1
          timeFilterStart = startOfDay(thirtyDaysAgo).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        default:
          // Default to last 30 days
          const defaultDaysAgo = new Date(now);
          defaultDaysAgo.setDate(now.getDate() - 29);
          timeFilterStart = startOfDay(defaultDaysAgo).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
      }

      const { data, error } = await supabase
        .from('database_tagihan')
        .select('nama_verifikator')
        .eq('status_tagihan', 'Diteruskan')
        .not('nama_verifikator', 'is', null)
        .gte('waktu_verifikasi', timeFilterStart)
        .lte('waktu_verifikasi', timeFilterEnd);

      if (error) throw error;

      // Group by verifikator and count
      const verifikatorMap = new Map<string, number>();
      data.forEach(item => {
        const name = item.nama_verifikator!;
        verifikatorMap.set(name, (verifikatorMap.get(name) || 0) + 1);
      });

      // Convert to array and sort
      const verifikatorArray = Array.from(verifikatorMap.entries())
        .map(([nama_verifikator, total_tagihan]) => ({
          nama_verifikator,
          total_tagihan,
          percentage: 0, // Will calculate below
        }))
        .sort((a, b) => b.total_tagihan - a.total_tagihan)
        .slice(0, 5);

      // Calculate percentages based on max
      if (verifikatorArray.length > 0) {
        const maxTagihan = verifikatorArray[0].total_tagihan;
        verifikatorArray.forEach(item => {
          item.percentage = maxTagihan > 0 ? (item.total_tagihan / maxTagihan) * 100 : 0;
        });
      }

      setTopVerifikatorData(verifikatorArray);
    } catch (error: any) {
      console.error('Error fetching top verifikator data:', error.message);
      toast.error('Gagal memuat data top verifikator: ' + error.message);
      setTopVerifikatorData([]);
    }
  }, [profile, topVerifikatorTimeFilter]);

  // Function to fetch Top 10 SKPD data
  const fetchTopSkpd = useCallback(async () => {
    if (!profile || profile.peran !== 'Administrator') {
      return;
    }

    try {
      const now = new Date();
      let timeFilterStart: string;
      let timeFilterEnd: string;

      switch (topSkpdTimeFilter) {
        case 'Hari Ini':
          timeFilterStart = startOfDay(now).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        case '7 Hari Terakhir':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 6);
          timeFilterStart = startOfDay(sevenDaysAgo).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        case '30 Hari Terakhir':
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 29);
          timeFilterStart = startOfDay(thirtyDaysAgo).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
        default:
          const defaultDaysAgo = new Date(now);
          defaultDaysAgo.setDate(now.getDate() - 29);
          timeFilterStart = startOfDay(defaultDaysAgo).toISOString();
          timeFilterEnd = endOfDay(now).toISOString();
          break;
      }

      const { data, error } = await supabase
        .from('database_tagihan')
        .select('nama_skpd, jumlah_kotor')
        .eq('status_tagihan', 'Diteruskan')
        .not('nama_skpd', 'is', null)
        .gte('waktu_verifikasi', timeFilterStart)
        .lte('waktu_verifikasi', timeFilterEnd);

      if (error) throw error;

      // Group by SKPD and sum amounts
      const skpdMap = new Map<string, { total_amount: number; transaction_count: number }>();
      data.forEach(item => {
        const name = item.nama_skpd!;
        const current = skpdMap.get(name) || { total_amount: 0, transaction_count: 0 };
        skpdMap.set(name, {
          total_amount: current.total_amount + (item.jumlah_kotor || 0),
          transaction_count: current.transaction_count + 1
        });
      });

      // Convert to array and sort by total amount
      const skpdArray = Array.from(skpdMap.entries())
        .map(([nama_skpd, stats]) => ({
          nama_skpd,
          total_amount: stats.total_amount,
          transaction_count: stats.transaction_count,
          percentage: 0, // Will calculate below
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10); // Top 10

      // Calculate percentages based on max
      if (skpdArray.length > 0) {
        const maxAmount = skpdArray[0].total_amount;
        skpdArray.forEach(item => {
          item.percentage = maxAmount > 0 ? (item.total_amount / maxAmount) * 100 : 0;
        });
      }

      setTopSkpdData(skpdArray);
    } catch (error: any) {
      console.error('Error fetching top SKPD data:', error.message);
      toast.error('Gagal memuat data top SKPD: ' + error.message);
      setTopSkpdData([]);
    }
  }, [profile, topSkpdTimeFilter]);


  useEffect(() => {
    const loadAllData = async () => {
      setLoadingData(true);
      await Promise.all([
        fetchKpiData(),
        fetchChartData(),
        fetchTopVerifikator(),
        fetchTopSkpd(),
      ]);
      setLoadingData(false);
    };

    if (!sessionLoading && profile?.peran === 'Administrator') {
      loadAllData();
    }
  }, [sessionLoading, profile, processedStatusFilter, totalAmountTimeFilter, selectedTimeRangeForChart, topVerifikatorTimeFilter, topSkpdTimeFilter, fetchKpiData, fetchChartData, fetchTopVerifikator, fetchTopSkpd, theme]);

  // Reset Top SKPD pagination when filter changes
  useEffect(() => {
    setTopSkpdCurrentPage(1);
  }, [topSkpdTimeFilter]);


  if (loadingPage || loadingData) {
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
              Sedang mengambil data sistem...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <LayoutDashboardIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Dashboard Administrator
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Selamat datang, {profile?.nama_lengkap || 'Administrator'}! 👋
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total SKPD Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total SKPD</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <UsersIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.totalSKPD || 0}
            </div>
            <p className="text-xs text-white/80 font-medium">
              SKPD Terdaftar
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <UsersIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Menunggu Aktivasi Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Menunggu Aktivasi</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <HourglassIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.newUsersPendingActivation || 0}
            </div>
            <p className="text-xs text-white/80 font-medium">
              Perlu Penetapan SKPD
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <HourglassIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Nilai Total Tagihan Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Nilai Total Tagihan</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                onValueChange={(value: 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini') => setTotalAmountTimeFilter(value)}
                value={totalAmountTimeFilter}
              >
                <SelectTrigger className="h-7 w-auto px-2 border-white/30 bg-white/10 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/20 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                  <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                  <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
                  <SelectItem value="Tahun Ini">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
              <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <TrendingUpIcon className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl sm:text-3xl font-bold text-white mb-1 break-words">
              Rp{(kpiData?.totalAmountProcessed || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-white/80 font-medium">
              Tagihan Diteruskan
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <TrendingUpIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Tagihan Dalam Antrian Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Dalam Antrian</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <ActivityIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.queuedTagihan || 0}
            </div>
            <p className="text-xs text-white/80 font-medium">
              Menunggu Proses
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <ActivityIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Cards Grid: Verifikator & SKPD */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top 5 Verifikator Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                  <TrendingUpIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Top 5 Verifikator
                  </CardTitle>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Petugas dengan jumlah verifikasi tagihan tertinggi
                  </p>
                </div>
              </div>
              <Select
                onValueChange={(value: 'Hari Ini' | '7 Hari Terakhir' | '30 Hari Terakhir') => setTopVerifikatorTimeFilter(value)}
                value={topVerifikatorTimeFilter}
              >
                <SelectTrigger className="w-[160px] h-9 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                  <SelectItem value="7 Hari Terakhir">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30 Hari Terakhir">30 Hari Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {topVerifikatorData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-slate-200 dark:bg-slate-800 mb-4">
                  <TrendingUpIcon className="h-12 w-12 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Tidak ada data verifikator
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Belum ada tagihan yang diverifikasi pada periode ini
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {topVerifikatorData.map((verifikator, index) => {
                  // Get initials from name
                  const nameParts = verifikator.nama_verifikator.split(' ');
                  const initials = nameParts.length >= 2
                    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                    : verifikator.nama_verifikator.substring(0, 2).toUpperCase();

                  return (
                    <div key={index} className="group">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Avatar with initials */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                          <span className="text-sm font-bold text-white">{initials}</span>
                        </div>
                        {/* Name and count */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {verifikator.nama_verifikator}
                            </p>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {Math.round(verifikator.percentage)}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {verifikator.total_tagihan.toLocaleString('id-ID')} tagihan diverifikasi
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="ml-[52px]">
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${verifikator.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 SKPD Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md shadow-blue-500/20">
                  <DollarSignIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    Top 10 SKPD by Amount
                  </CardTitle>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    SKPD dengan total jumlah kotor tertinggi
                  </p>
                </div>
              </div>
              <Select
                onValueChange={(value: 'Hari Ini' | '7 Hari Terakhir' | '30 Hari Terakhir') => setTopSkpdTimeFilter(value)}
                value={topSkpdTimeFilter}
              >
                <SelectTrigger className="w-[160px] h-9 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                  <SelectItem value="7 Hari Terakhir">7 Hari Terakhir</SelectItem>
                  <SelectItem value="30 Hari Terakhir">30 Hari Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {topSkpdData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-slate-200 dark:bg-slate-800 mb-4">
                  <DollarSignIcon className="h-12 w-12 text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Tidak ada data SKPD
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Belum ada tagihan yang diverifikasi pada periode ini
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {topSkpdData
                    .slice((topSkpdCurrentPage - 1) * topSkpdItemsPerPage, topSkpdCurrentPage * topSkpdItemsPerPage)
                    .map((skpd, index) => {
                      const nameParts = skpd.nama_skpd.split(' ');
                      const initials = nameParts.length >= 2
                        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                        : skpd.nama_skpd.substring(0, 2).toUpperCase();

                      return (
                        <div key={index} className="group">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                              <span className="text-sm font-bold text-white">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {skpd.nama_skpd}
                                </p>
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  {Math.round(skpd.percentage)}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                {skpd.transaction_count.toLocaleString('id-ID')} transaksi - Rp{skpd.total_amount.toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                          <div className="ml-[52px]">
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${skpd.percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Pagination Controls */}
                {topSkpdData.length > topSkpdItemsPerPage && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {(topSkpdCurrentPage - 1) * topSkpdItemsPerPage + 1} - {Math.min(topSkpdCurrentPage * topSkpdItemsPerPage, topSkpdData.length)} of {topSkpdData.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTopSkpdCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={topSkpdCurrentPage === 1}
                        className="h-8 px-3 text-xs"
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTopSkpdCurrentPage(prev => Math.min(Math.ceil(topSkpdData.length / topSkpdItemsPerPage), prev + 1))}
                        disabled={topSkpdCurrentPage >= Math.ceil(topSkpdData.length / topSkpdItemsPerPage)}
                        className="h-8 px-3 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                <BarChart3Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Status Alur Kerja
                </CardTitle>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Visualisasi status tagihan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Time Range Filter */}
              <Select
                onValueChange={(value: 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini') => setSelectedTimeRangeForChart(value)}
                value={selectedTimeRangeForChart}
              >
                <SelectTrigger className="w-[140px] h-9 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                  <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                  <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
                  <SelectItem value="Tahun Ini">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>

              {/* Chart Type Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200 dark:bg-slate-800">
                <Button
                  variant={chartView === 'bar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartView('bar')}
                  className={cn(
                    "h-7 px-3 transition-all duration-200",
                    chartView === 'bar'
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:from-emerald-600 hover:to-teal-700"
                      : "hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                  title="Tampilkan Bar Chart"
                >
                  <BarChart3Icon className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">Bar</span>
                </Button>
                <Button
                  variant={chartView === 'donut' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartView('donut')}
                  className={cn(
                    "h-7 px-3 transition-all duration-200",
                    chartView === 'donut'
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:from-emerald-600 hover:to-teal-700"
                      : "hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                  title="Tampilkan Donut Chart"
                >
                  <PieChartIcon className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">Donut</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {barChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <BarChart3Icon className="h-12 w-12 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Tidak ada data untuk ditampilkan
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Silakan pilih rentang waktu yang berbeda
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              {chartView === 'bar' ? (
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <XAxis
                    dataKey="name"
                    stroke={axisAndLabelColor}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: axisAndLabelColor }}
                  />
                  <YAxis
                    stroke={axisAndLabelColor}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: axisAndLabelColor }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                    contentStyle={{
                      backgroundColor: tooltipBgColor,
                      borderColor: '#10b981',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{ color: tooltipTextColor }}
                    labelStyle={{ color: tooltipTextColor, fontWeight: 'bold' }}
                  />
                  <Legend
                    wrapperStyle={{ color: legendTextColor, paddingTop: '20px' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="value"
                    fill={({ name }) => currentChartColors[statusColorMap[name as keyof typeof statusColorMap]]}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={barChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    paddingAngle={3}
                  >
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={currentChartColors[statusColorMap[entry.name as keyof typeof statusColorMap]]}
                        className="hover:opacity-80 transition-opacity duration-200"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value.toLocaleString('id-ID')}`, name]}
                    contentStyle={{
                      backgroundColor: tooltipBgColor,
                      borderColor: '#10b981',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{ color: tooltipTextColor }}
                    labelStyle={{ color: tooltipTextColor, fontWeight: 'bold' }}
                  />
                  <Legend
                    wrapperStyle={{ color: legendTextColor, paddingTop: '20px' }}
                    iconType="circle"
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;