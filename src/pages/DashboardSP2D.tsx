import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Clock,
    CreditCard,
    CheckCircle,
    ArrowRight,
    TrendingUp,
    Sparkles,
    ClipboardCheckIcon,
} from 'lucide-react';
import { format, parseISO, startOfDay, getMonth, getYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { Combobox } from '@/components/ui/combobox';
import { useNavigate } from 'react-router-dom';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

import { Tagihan } from '@/types/tagihan';

const months = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' },
    { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mei' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Desember' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
}));

const DashboardSP2D = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Period Filters
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Stats State
    const [stats, setStats] = useState({
        antrianCount: 0,
        antrianNominal: 0,
        selesaiPeriodeIni: 0,
        selesaiNominal: 0,
    });

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
        `Selamat datang ${profile?.nama_lengkap || 'Pengguna'}! Siap memproses registrasi SP2D hari ini?`,
        `${greeting}, tetap semangat dalam melayani!!`
    ], [greeting, profile?.nama_lengkap]);

    const animatedText = useTypingAnimation(typingTexts, 80, 40, 3000);

    useEffect(() => {
        if (user && (profile?.peran === 'Register SP2D' || profile?.peran === 'Administrator')) {
            fetchStats();
        }
    }, [user, profile, selectedMonth, selectedYear]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Calculate date range based on selected month
            let startDate: Date;
            let endDate: Date;

            if (selectedMonth === 'all') {
                startDate = new Date(parseInt(selectedYear), 0, 1);
                endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
            } else {
                startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
                endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0, 23, 59, 59);
            }

            // Format for DATE column (YYYY-MM-DD)
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            // Fetch Antrian Count and Nominal (Filtered by period)
            const { data: antrianData, error: antrianError } = await supabase
                .from('database_tagihan')
                .select('jumlah_kotor')
                .eq('status_tagihan', 'Diteruskan')
                .gte('waktu_verifikasi', startDate.toISOString())
                .lte('waktu_verifikasi', endDate.toISOString());

            if (antrianError) throw antrianError;

            const antrianCount = antrianData?.length || 0;
            const antrianNominal = antrianData?.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0) || 0;

            // Fetch Selesai Periode Ini (Status: Selesai)
            // Selesai is filtered by tanggal_sp2d (date)
            const { data: selesaiData, error: selesaiError } = await supabase
                .from('database_tagihan')
                .select('jumlah_kotor')
                .eq('status_tagihan', 'Selesai')
                .gte('tanggal_sp2d', startDateStr)
                .lte('tanggal_sp2d', endDateStr);

            if (selesaiError) throw selesaiError;

            const selesaiCount = selesaiData?.length || 0;
            const selesaiNominal = selesaiData?.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0) || 0;

            setStats({
                antrianCount,
                antrianNominal,
                selesaiPeriodeIni: selesaiCount,
                selesaiNominal,
            });
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            toast.error('Gagal memuat statistik: ' + (error.message || 'Terjadi kesalahan internal'));
        } finally {
            setLoading(false);
        }
    };

    if (sessionLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                        Memuat dashboard...
                    </p>
                </div>
            </div>
        );
    }

    if (!user || (profile?.peran !== 'Register SP2D' && profile?.peran !== 'Administrator')) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
                    <ClipboardCheckIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                    Dashboard {profile?.peran === 'Register SP2D' ? 'Registrator SP2D' : 'SP2D'}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="inline-flex items-center">
                        {animatedText}
                        <span className="inline-block w-0.5 h-5 bg-emerald-500 ml-1 animate-pulse"></span>
                    </span>
                </p>
            </div>

            {/* Filter Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/50 shadow-sm">
                <div className="flex items-center gap-2 px-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Periode</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-full sm:w-40">
                        <Combobox
                            options={months}
                            value={selectedMonth}
                            onValueChange={setSelectedMonth}
                            placeholder="Bulan"
                            className="w-full h-9 rounded-lg border-slate-200 bg-white text-xs"
                        />
                    </div>
                    <div className="w-full sm:w-28">
                        <Combobox
                            options={years}
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                            placeholder="Tahun"
                            className="w-full h-9 rounded-lg border-slate-200 bg-white text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Total Antrian */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 overflow-hidden relative group h-full">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-5 relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-emerald-50/80 text-[10px] font-bold uppercase tracking-widest">Antrian Periode</p>
                                <h3 className="text-4xl font-black text-white leading-tight">{loading ? '...' : stats.antrianCount}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                                <Clock className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <p className="text-emerald-50/60 text-[10px] mt-4 font-medium italic border-t border-white/10 pt-2">
                            Berkas menunggu registrasi
                        </p>
                    </CardContent>
                </Card>

                {/* Card 2: Antrian Rupiah */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden relative group h-full">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <CreditCard className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-5 relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                                <p className="text-blue-50/80 text-[10px] font-bold uppercase tracking-widest truncate">Nominal Antrian</p>
                                <h3 className="text-base sm:text-lg font-black text-white leading-tight break-words">
                                    {loading ? '...' : `Rp${stats.antrianNominal.toLocaleString('id-ID')}`}
                                </h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                                <CreditCard className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <p className="text-blue-50/60 text-[10px] mt-4 font-medium italic border-t border-white/10 pt-2 truncate">
                            Total nilai antrian saat ini
                        </p>
                    </CardContent>
                </Card>

                {/* Card 3: Selesai Periode Ini */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden relative group h-full">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-5 relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-amber-50/80 text-[10px] font-bold uppercase tracking-widest">Selesai Berkas</p>
                                <h3 className="text-4xl font-black text-white leading-tight">{loading ? '...' : stats.selesaiPeriodeIni}</h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                                <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <p className="text-amber-50/60 text-[10px] mt-4 font-medium italic border-t border-white/10 pt-2">
                            Periode {selectedMonth === 'all' ? selectedYear : `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
                        </p>
                    </CardContent>
                </Card>

                {/* Card 4: Nominal Selesai */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-rose-500 to-pink-600 overflow-hidden relative group h-full">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-5 relative z-10 h-full flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                                <p className="text-rose-50/80 text-[10px] font-bold uppercase tracking-widest truncate">Total Nominal Diproses</p>
                                <h3 className="text-base sm:text-lg font-black text-white leading-tight break-words">
                                    {loading ? '...' : `Rp${stats.selesaiNominal.toLocaleString('id-ID')}`}
                                </h3>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shrink-0">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <p className="text-rose-50/60 text-[10px] mt-4 font-medium italic border-t border-white/10 pt-2 truncate">
                            Total nilai yang diproses
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Button */}
            <Card className="border-none shadow-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Siap untuk Registrasi?</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Kelola antrian dan lakukan registrasi SP2D untuk dokumen yang sudah diteruskan.
                            </p>
                        </div>
                        <Button
                            onClick={() => navigate('/portal-sp2d')}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-emerald-500/30 gap-3 transition-all hover:scale-105"
                        >
                            Kelola Registrasi SP2D
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardSP2D;
