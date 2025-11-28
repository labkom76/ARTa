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
  PieChartIcon,
  ClipboardCheckIcon,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart, // Import PieChart
  Pie,      // Import Pie
  Cell,     // Import Cell for PieChart colors
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

// NEW IMPORTS FOR SWIPER
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination'; // Import Swiper pagination styles
import { Pagination, Autoplay } from 'swiper/modules'; // Import Swiper modules, including Autoplay

interface KPIData {
  antrianVerifikasi: number;
  totalDiprosesBulanIni: number; // Changed from diverifikasiHariIni
  diteruskanHariIni: number;
  dikembalikanHariIni: number;
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

  // Define colors for the Pie Chart
  const PIE_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#3B82F6', '#6366F1'];


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

        // KPI 2: Total Diproses (Bulan Ini) - MODIFIED
        const { count: totalDiprosesBulanIniCount, error: totalDiprosesBulanIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .eq('nama_verifikator', profile?.nama_lengkap) // Filter by current verifier
          .gte('waktu_verifikasi', thisMonthStart)
          .lte('waktu_verifikasi', thisMonthEnd);
        if (totalDiprosesBulanIniError) throw totalDiprosesBulanIniError;

        // NEW KPI: Diteruskan Hari Ini
        const { count: diteruskanHariIniCount, error: diteruskanHariIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Diteruskan')
          .eq('nama_verifikator', profile?.nama_lengkap)
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);
        if (diteruskanHariIniError) throw diteruskanHariIniError;

        // NEW KPI: Dikembalikan Hari Ini
        const { count: dikembalikanHariIniCount, error: dikembalikanHariIniError } = await supabase
          .from('database_tagihan')
          .select('*', { count: 'exact', head: true })
          .eq('status_tagihan', 'Dikembalikan')
          .eq('nama_verifikator', profile?.nama_lengkap)
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);
        if (dikembalikanHariIniError) throw dikembalikanHariIniError;

        setKpiData({
          antrianVerifikasi: antrianVerifikasiCount || 0,
          totalDiprosesBulanIni: totalDiprosesBulanIniCount || 0, // Updated
          diteruskanHariIni: diteruskanHariIniCount || 0,
          dikembalikanHariIni: dikembalikanHariIniCount || 0,
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
      <div className="p-6 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10 rounded-lg shadow-md border border-emerald-200 dark:border-emerald-900/30">
        <h1 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-4">Memuat Dashboard Verifikasi...</h1>
        <p className="text-slate-600 dark:text-slate-400">Sedang mengambil data untuk Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Verifikator') {
    return (
      <div className="p-6 bg-gradient-to-br from-white to-red-50/20 dark:from-slate-900 dark:to-red-950/10 rounded-lg shadow-md border border-red-200 dark:border-red-900/30">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-slate-600 dark:text-slate-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
          <ClipboardCheckIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          Dashboard Verifikasi
        </h1>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Selamat datang, {profile?.nama_lengkap}! Siap memverifikasi tagihan hari ini?
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Antrian Verifikasi</CardTitle>
            <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-lg">
              <HourglassIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-400">{kpiData?.antrianVerifikasi}</div>
            <p className="text-xs text-muted-foreground">Tagihan menunggu verifikasi</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Diproses (Bulan Ini)</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{kpiData?.totalDiprosesBulanIni}</div>
            <p className="text-xs text-muted-foreground">Total tagihan diproses bulan ini</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Diteruskan Hari Ini</CardTitle>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{kpiData?.diteruskanHariIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan diteruskan hari ini</p>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 bg-gradient-to-br from-white to-red-50/30 dark:from-slate-900 dark:to-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dikembalikan Hari Ini</CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
              <RotateCcwIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">{kpiData?.dikembalikanHariIni}</div>
            <p className="text-xs text-muted-foreground">Tagihan dikembalikan hari ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-md hover:shadow-lg transition-all duration-300 rounded-lg border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-emerald-200 dark:border-emerald-900/30">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                <BarChart3Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Hasil Verifikasi (30 Hari Terakhir)</CardTitle>
            </div>
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

        <Card className="shadow-md hover:shadow-lg transition-all duration-300 rounded-lg border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-emerald-200 dark:border-emerald-900/30">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                <PieChartIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Tagihan yang Dikembalikan (Per SKPD)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={skpdProblemChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false} // Menonaktifkan garis label
                  label={false} // Menonaktifkan label teks langsung pada irisan
                  outerRadius={100} // Adjusted outerRadius
                  innerRadius={60} // For donut effect
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={5}
                >
                  {skpdProblemChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [`${value} tagihan`, name]} /> {/* Formatter for tooltip */}
                {/* REMOVED: <Legend /> */}
              </PieChart>
            </ResponsiveContainer>
            {/* NEW: Swiper for custom legend */}
            {skpdProblemChartData.length > 0 && (
              <Swiper
                slidesPerView={3}
                spaceBetween={10}
                loop={true}
                pagination={{ clickable: true }}
                modules={[Pagination, Autoplay]} // Added Autoplay module
                autoplay={{ delay: 3000, disableOnInteraction: false }} // Enabled autoplay
                className="mt-4 pb-8" // Add some margin top and padding bottom for pagination dots
              >
                {skpdProblemChartData.map((entry, index) => (
                  <SwiperSlide key={entry.name}>
                    <div className="flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 h-auto"> {/* Added h-auto */}
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      ></span>
                      <span className="text-sm text-gray-800 dark:text-gray-200 whitespace-normal"> {/* Removed truncate */}
                        {entry.name}
                      </span>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardVerifikasi;