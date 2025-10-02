import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboardIcon, UsersIcon, FileTextIcon, CheckCircleIcon, HourglassIcon, DollarSignIcon } from 'lucide-react';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface KPIData {
  totalSKPD: number;
  processedTagihanCount: number;
  totalAmountProcessed: number;
  queuedTagihan: number;
}

interface BarChartDataItem {
  name: string;
  value: number;
  color: string;
}

const AdminDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // State for filters
  const [processedStatusFilter, setProcessedStatusFilter] = useState<'Diteruskan' | 'Dikembalikan'>('Diteruskan');
  const [totalAmountTimeFilter, setTotalAmountTimeFilter] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini'>('Bulan Ini');

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
        { name: 'Menunggu Registrasi', value: statusCounts['Menunggu Registrasi'], color: '#FFC107' }, // Yellow
        { name: 'Menunggu Verifikasi', value: statusCounts['Menunggu Verifikasi'], color: '#9C27B0' }, // Purple
        { name: 'Diteruskan', value: statusCounts['Diteruskan'], color: '#4CAF50' }, // Green
        { name: 'Dikembalikan', value: statusCounts['Dikembalikan'], color: '#F44336' }, // Red
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
  }, [sessionLoading, profile, processedStatusFilter, totalAmountTimeFilter]); // Add filters to dependencies

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
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
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
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SKPD</CardTitle>
            <UsersIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.totalSKPD}</div>
            <p className="text-xs text-muted-foreground">Jumlah SKPD Terdaftar</p>
          </CardContent>
        </Card>

        {/* Tagihan Diproses (Bulan Ini) Card with filter */}
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2"> {/* Changed to flex-row, justify-between, items-center */}
            <div className="flex items-center gap-2"> {/* Group title and icon */}
              <CardTitle className="text-sm font-medium">Tagihan Diproses (Bulan Ini)</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-green-500" />
            </div>
            <Select onValueChange={(value: 'Diteruskan' | 'Dikembalikan') => setProcessedStatusFilter(value)} value={processedStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.processedTagihanCount}</div>
            <p className="text-xs text-muted-foreground">Tagihan {processedStatusFilter.toLowerCase()} bulan ini</p>
          </CardContent>
        </Card>

        {/* Nilai Total Tagihan Card with filter */}
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2"> {/* Changed to flex-row, justify-between, items-center */}
            <div className="flex items-center gap-2"> {/* Group title and icon */}
              <CardTitle className="text-sm font-medium">Nilai Total Tagihan</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-purple-500" />
            </div>
            <Select onValueChange={(value: 'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Tahun Ini') => setTotalAmountTimeFilter(value)} value={totalAmountTimeFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filter Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hari Ini">Hari Ini</SelectItem>
                <SelectItem value="Minggu Ini">Minggu Ini</SelectItem>
                <SelectItem value="Bulan Ini">Bulan Ini</SelectItem>
                <SelectItem value="Tahun Ini">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp{kpiData?.totalAmountProcessed.toLocaleString('id-ID') || '0'}</div>
            <p className="text-xs text-muted-foreground">Jumlah kotor tagihan diteruskan</p>
          </CardContent>
        </Card>

        {/* Tagihan Dalam Antrian Card */}
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Dalam Antrian</CardTitle>
            <HourglassIcon className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.queuedTagihan}</div>
            <p className="text-xs text-muted-foreground">Menunggu registrasi/verifikasi</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafik Batang (Bar Chart) */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <LayoutDashboardIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            Status Alur Kerja Langsung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill={(entry) => entry.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;