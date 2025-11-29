import React, { useEffect, useState, useMemo } from 'react';
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
import { useTypingAnimation } from '@/hooks/use-typing-animation';

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
    `Selamat datang ${profile?.nama_lengkap || 'yudistira'}! Siap memverifikasi tagihan hari ini?`,
    `${greeting}, tetap semangat yaa!!`
  ], [greeting, profile?.nama_lengkap]);

  const animatedText = useTypingAnimation(typingTexts, 80, 40, 3000);


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

  if (profile?.peran !== 'Staf Verifikator') {
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
          <ClipboardCheckIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          Dashboard Verifikasi
        </h1>
        <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          <span className="inline-flex items-center">
            {animatedText}
            <span className="inline-block w-0.5 h-5 bg-emerald-500 ml-1 animate-pulse"></span>
          </span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Antrian Verifikasi Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Antrian Verifikasi</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <HourglassIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.antrianVerifikasi}
            </div>
            <p className="text-xs text-white/80 font-medium">
              Tagihan menunggu verifikasi
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <HourglassIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Total Diproses (Bulan Ini) Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Total Diproses (Bulan Ini)</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.totalDiprosesBulanIni}
            </div>
            <p className="text-xs text-white/80 font-medium">
              Total tagihan diproses bulan ini
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <CheckCircleIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Diteruskan Hari Ini Card */}
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-100"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Diteruskan Hari Ini</CardTitle>
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-white mb-1">
              {kpiData?.diteruskanHariIni}
            </div>
            <p className="text-xs text-white/80 font-medium">
              Tagihan diteruskan hari ini
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <CheckCircleIcon className="h-24 w-24 text-white" />
            </div>
          </CardContent>
        </Card>

        {/* Dikembalikan Hari Ini Card */}
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
            <p className="text-xs text-white/80 font-medium">
              Tagihan dikembalikan hari ini
            </p>
            <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
              <RotateCcwIcon className="h-24 w-24 text-white" />
            </div>
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