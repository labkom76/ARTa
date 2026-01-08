import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { format, parseISO, startOfDay, getMonth, getYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { Combobox } from '@/components/ui/combobox';
import { useNavigate } from 'react-router-dom';

import { Tagihan } from '@/types/tagihan';

const months = [
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
    });

    useEffect(() => {
        if (user && (profile?.peran === 'Register SP2D' || profile?.peran === 'Administrator')) {
            fetchStats();
        }
    }, [user, profile, selectedMonth, selectedYear]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Calculate date range for the selected month/year
            const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
            const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0, 23, 59, 59);

            // Format for DATE column (YYYY-MM-DD)
            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            // Fetch Antrian Count and Nominal
            // Antrian is filtered by waktu_verifikasi (timestamp)
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
            const { count: selesaiCount, error: selesaiError } = await supabase
                .from('database_tagihan')
                .select('*', { count: 'exact', head: true })
                .eq('status_tagihan', 'Selesai')
                .gte('tanggal_sp2d', startDateStr)
                .lte('tanggal_sp2d', endDateStr);

            if (selesaiError) throw selesaiError;

            setStats({
                antrianCount,
                antrianNominal,
                selesaiPeriodeIni: selesaiCount || 0,
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
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Dashboard SP2D
                        </h1>
                        <p className="text-sm text-slate-600 mt-0.5 font-medium">
                            Monitoring kinerja dan statistik penerbitan SP2D
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className="text-sm font-semibold text-slate-700">Filter Periode:</span>
                            <div className="w-full sm:w-48">
                                <Combobox
                                    options={months}
                                    value={selectedMonth}
                                    onValueChange={setSelectedMonth}
                                    placeholder="Pilih Bulan"
                                    className="w-full h-12 rounded-xl border-slate-200 bg-slate-50/50"
                                />
                            </div>
                            <div className="w-full sm:w-32">
                                <Combobox
                                    options={years}
                                    value={selectedYear}
                                    onValueChange={setSelectedYear}
                                    placeholder="Pilih Tahun"
                                    className="w-full h-12 rounded-xl border-slate-200 bg-slate-50/50"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Antrian Periode */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-50/80 text-xs font-bold uppercase tracking-widest">Antrian Periode</p>
                                <h3 className="text-5xl font-bold text-white mt-2">{loading ? '...' : stats.antrianCount}</h3>
                                <p className="text-emerald-50/60 text-[10px] mt-2 font-medium italic">Berkas menunggu registrasi</p>
                            </div>
                            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                                <Clock className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2: Nominal Antrian */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <CreditCard className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-50/80 text-xs font-bold uppercase tracking-widest">Nominal Antrian (IDR)</p>
                                <h3 className="text-2xl font-bold text-white mt-2">
                                    {loading ? '...' : `Rp${stats.antrianNominal.toLocaleString('id-ID')}`}
                                </h3>
                                <p className="text-blue-50/60 text-[10px] mt-2 font-medium italic">Berdasarkan filter saat ini</p>
                            </div>
                            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                                <CreditCard className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 3: Selesai Periode Ini */}
                <Card className="border-none shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-24 w-24 text-white" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-amber-50/80 text-xs font-bold uppercase tracking-widest">Selesai Periode Ini</p>
                                <h3 className="text-5xl font-bold text-white mt-2">{loading ? '...' : stats.selesaiPeriodeIni}</h3>
                                <p className="text-amber-50/60 text-[10px] mt-2 font-medium italic">Total dokumen diregistrasi</p>
                            </div>
                            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                                <CheckCircle className="h-7 w-7 text-white" />
                            </div>
                        </div>
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
