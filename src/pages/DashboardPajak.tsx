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
    FileTextIcon,
    WalletIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Combobox } from '@/components/ui/combobox';
import { useNavigate } from 'react-router-dom';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

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

const DashboardPajak = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Period Filters
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Stats State
    const [stats, setStats] = useState({
        antrianPajak: 0,
        selesaiPajak: 0,
        totalNominalPajak: 0,
    });

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) return 'Selamat Pagi';
        if (hour >= 11 && hour < 15) return 'Selamat Siang';
        if (hour >= 15 && hour < 18) return 'Selamat Sore';
        return 'Selamat Malam';
    }, []);

    const typingTexts = useMemo(() => [
        `Halo ${profile?.nama_lengkap || 'Staf Pajak'}! Sudah siap menginput data pajak hari ini?`,
        `${greeting}, mari tuntaskan kewajiban pajak negara!`
    ], [greeting, profile?.nama_lengkap]);

    const animatedText = useTypingAnimation(typingTexts, 80, 40, 3000);

    useEffect(() => {
        if (user && (profile?.peran === 'Staf Pajak' || profile?.peran === 'Administrator')) {
            fetchStats();
        }
    }, [user, profile, selectedMonth, selectedYear]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            let startDate: Date;
            let endDate: Date;

            if (selectedMonth === 'all') {
                startDate = new Date(parseInt(selectedYear), 0, 1);
                endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
            } else {
                startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
                endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0, 23, 59, 59);
            }

            const startDateStr = format(startDate, 'yyyy-MM-dd');
            const endDateStr = format(endDate, 'yyyy-MM-dd');

            // 1. Antrian Pajak: Tagihan status 'Selesai' (Sudah SP2D) tapi status_pajak != 'Selesai'
            const { count: antrianCount, error: antrianError } = await supabase
                .from('database_tagihan')
                .select('*', { count: 'exact', head: true })
                .eq('status_tagihan', 'Selesai')
                .or(`status_pajak.neq.Selesai,status_pajak.is.null`)
                .gte('tanggal_sp2d', startDateStr)
                .lte('tanggal_sp2d', endDateStr);

            if (antrianError) throw antrianError;

            // 2. Selesai Pajak & Total Nominal Pajak dari database_pajak
            const { data: pajakData, error: pajakError } = await supabase
                .from('database_pajak')
                .select('jumlah_pajak, id_tagihan')
                .gte('waktu_input', startDate.toISOString())
                .lte('waktu_input', endDate.toISOString());

            if (pajakError) throw pajakError;

            const selesaiCount = new Set(pajakData?.map(p => p.id_tagihan)).size;
            const totalNominal = pajakData?.reduce((sum, item) => sum + (item.jumlah_pajak || 0), 0) || 0;

            setStats({
                antrianPajak: antrianCount || 0,
                selesaiPajak: selesaiCount,
                totalNominalPajak: totalNominal,
            });
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            toast.error('Gagal memuat statistik pajak');
        } finally {
            setLoading(false);
        }
    };

    if (sessionLoading) return null;

    if (!user || (profile?.peran !== 'Staf Pajak' && profile?.peran !== 'Administrator')) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
                    <WalletIcon className="h-10 w-10 text-blue-600" />
                    Dashboard Pajak
                </h1>
                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span>{animatedText}</span>
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-2 px-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Periode SP2D</span>
                </div>
                <div className="flex items-center gap-2">
                    <Combobox options={months} value={selectedMonth} onValueChange={setSelectedMonth} placeholder="Bulan" className="w-40 h-9" />
                    <Combobox options={years} value={selectedYear} onValueChange={setSelectedYear} placeholder="Tahun" className="w-28 h-9" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl bg-gradient-to-br from-orange-400 to-red-500 text-white relative group overflow-hidden">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <p className="text-orange-50/80 text-xs font-bold uppercase tracking-widest">Antrian Pajak</p>
                        <h3 className="text-4xl font-black mt-2">{loading ? '...' : stats.antrianPajak}</h3>
                        <p className="text-orange-50/60 text-[10px] mt-4 italic border-t border-white/10 pt-2">Tagihan sudah SP2D menunggu input pajak</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative group overflow-hidden">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <p className="text-emerald-50/80 text-xs font-bold uppercase tracking-widest">Selesai Input</p>
                        <h3 className="text-4xl font-black mt-2">{loading ? '...' : stats.selesaiPajak}</h3>
                        <p className="text-emerald-50/60 text-[10px] mt-4 italic border-t border-white/10 pt-2">Jumlah berkas pajak periode ini</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white relative group overflow-hidden">
                    <div className="absolute -top-4 -right-4 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-24 w-24" />
                    </div>
                    <CardContent className="p-6 relative z-10">
                        <p className="text-blue-50/80 text-xs font-bold uppercase tracking-widest">Total Nominal Pajak</p>
                        <h3 className="text-2xl font-black mt-2 leading-tight">Rp{loading ? '...' : stats.totalNominalPajak.toLocaleString('id-ID')}</h3>
                        <p className="text-blue-50/60 text-[10px] mt-4 italic border-t border-white/10 pt-2">Total nilai pajak yang tercatat</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Kelola Data Pajak</h3>
                            <p className="text-slate-600 dark:text-slate-400">Proses input NTPN, NTB, dan rincian pajak untuk tagihan yang sudah terbit SP2D.</p>
                        </div>
                        <Button onClick={() => navigate('/portal-pajak')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 rounded-xl shadow-lg shadow-blue-500/30 gap-3 transition-all">
                            Buka Portal Kerja Pajak
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardPajak;
