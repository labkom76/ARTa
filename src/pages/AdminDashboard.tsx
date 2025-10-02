import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboardIcon, UsersIcon, FileTextIcon, CheckCircleIcon, HourglassIcon, DollarSignIcon } from 'lucide-react'; // Added HourglassIcon and DollarSignIcon
import { toast } from 'sonner';
import { startOfMonth, endOfMonth } from 'date-fns';

interface KPIData {
  totalUsers: number;
  processedTagihanMonth: number;
  totalAmountProcessedMonth: number;
  queuedTagihan: number;
}

interface BarChartDataItem {
  name: string;
  value: number;
  color: string; // Add color property for each bar
}

const AdminDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [barChartData, setBarChartData] = useState<BarChartDataItem[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Combined loading state for KPI and chart

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

      // 1. Total Pengguna Aktif
      const { count: totalUsersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      // 2. Total Tagihan Diproses (Bulan Ini)
      const { count: processedTagihanCount, error: processedCountError } = await supabase
        .from('database_tagihan')
        .select('*', { count: 'exact', head: true })
        .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
        .gte('waktu_verifikasi', thisMonthStart)
        .lte('waktu_verifikasi', thisMonthEnd);
      if (processedCountError) throw processedCountError;

      // 3. Nilai Total Tagihan (Bulan Ini)
      const { data: totalAmountData, error: totalAmountError } = await supabase
        .from('database_tagihan')
        .select('jumlah_kotor')
        .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
        .gte('waktu_verifikasi', thisMonthStart)
        .lte('waktu_verifikasi', thisMonthEnd);
      if (totalAmountError) throw totalAmountError;

      const totalAmountProcessedMonth = totalAmountData.reduce((sum, tagihan) => sum + (tagihan.jumlah_kotor || 0), 0);

      // 4. Tagihan Dalam Antrian
      const { count: queuedTagihanCount, error: queuedError } = await supabase
        .from('database_tagihan')
        .select('*', { count: 'exact', head: true })
        .in('status_tagihan', ['Menunggu Registrasi', 'Menunggu Verifikasi']);
      if (queuedError) throw queuedError;

      setKpiData({
        totalUsers: totalUsersCount || 0,
        processedTagihanMonth: processedTagihanCount || 0,
        totalAmountProcessedMonth: totalAmountProcessedMonth,
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
  }, [sessionLoading, profile]);

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
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna Aktif</CardTitle>
            <UsersIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Jumlah pengguna terdaftar</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Diproses (Bulan Ini)</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData?.processedTagihanMonth}</div>
            <p className="text-xs text-muted-foreground">Tagihan diteruskan/dikembalikan</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Total Tagihan (Bulan Ini)</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp{kpiData?.totalAmountProcessedMonth.toLocaleString('id-ID') || '0'}</div>
            <p className="text-xs text-muted-foreground">Jumlah kotor tagihan diproses</p>
          </CardContent>
        </Card>

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