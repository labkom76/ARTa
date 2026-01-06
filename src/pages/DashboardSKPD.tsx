import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ReceiptTextIcon, HourglassIcon, FileCheckIcon, SendIcon, RotateCcwIcon, Sparkles, ClockIcon } from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

interface TagihanCounts {
    total: number;
    menungguRegistrasi: number;
    menungguVerifikasi: number;
    diteruskan: number;
    dikembalikan: number;
}

interface TimelineActivity {
    id_tagihan: string;
    nomor_spm: string;
    status_tagihan: string;
    waktu_input: string;
    waktu_registrasi?: string;
    waktu_verifikasi?: string;
    waktu_koreksi?: string;
}

const DashboardSKPD = () => {
    const navigate = useNavigate();
    const { user, profile, loading: sessionLoading } = useSession();
    const [counts, setCounts] = useState<TagihanCounts | null>(null);
    const [timelineActivities, setTimelineActivities] = useState<TimelineActivity[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

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
        `Saat ini Anda masuk sebagai ${profile?.peran || 'Pengguna'} pada ${profile?.asal_skpd || 'Tidak Diketahui'}.`,
        `${greeting}, tetap semangat yaa!!`
    ], [greeting, profile?.peran, profile?.asal_skpd]);

    const animatedText = useTypingAnimation(typingTexts, 80, 40, 3000);

    useEffect(() => {
        const fetchTagihanCounts = async () => {
            if (!user || sessionLoading) return;

            setDataLoading(true);
            try {
                const userId = user.id;
                const currentYear = new Date().getFullYear().toString();

                // Total Tagihan
                const { count: totalCount, error: totalError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .ilike('nomor_spm', `%/${currentYear}`);

                if (totalError) throw totalError;

                // Menunggu Registrasi
                const { count: menungguRegistrasiCount, error: menungguRegistrasiError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Menunggu Registrasi')
                    .ilike('nomor_spm', `%/${currentYear}`);

                if (menungguRegistrasiError) throw menungguRegistrasiError;

                // Menunggu Verifikasi
                const { count: menungguVerifikasiCount, error: menungguVerifikasiError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Menunggu Verifikasi')
                    .ilike('nomor_spm', `%/${currentYear}`);

                if (menungguVerifikasiError) throw menungguVerifikasiError;

                // Diteruskan
                const { count: diteruskanCount, error: diteruskanError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Diteruskan')
                    .ilike('nomor_spm', `%/${currentYear}`);

                if (diteruskanError) throw diteruskanError;

                // Dikembalikan
                const { count: dikembalikanCount, error: dikembalikanError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Dikembalikan')
                    .ilike('nomor_spm', `%/${currentYear}`);

                if (dikembalikanError) throw dikembalikanError;

                setCounts({
                    total: totalCount || 0,
                    menungguRegistrasi: menungguRegistrasiCount || 0,
                    menungguVerifikasi: menungguVerifikasiCount || 0,
                    diteruskan: diteruskanCount || 0,
                    dikembalikan: dikembalikanCount || 0,
                });
            } catch (error: any) {
                console.error('Error fetching tagihan counts:', error.message);
                toast.error('Gagal memuat data tagihan: ' + error.message);
            } finally {
                setDataLoading(false);
            }
        };

        const fetchTimelineActivities = async () => {
            if (!user || sessionLoading) return;

            try {
                const currentYear = new Date().getFullYear().toString();
                const { data, error } = await supabase
                    .from('database_tagihan')
                    .select('id_tagihan, nomor_spm, status_tagihan, waktu_input, waktu_registrasi, waktu_verifikasi, waktu_koreksi')
                    .eq('id_pengguna_input', user.id)
                    .ilike('nomor_spm', `%/${currentYear}`)
                    .order('waktu_input', { ascending: false })
                    .limit(5);

                if (error) throw error;

                const sortedData = (data || []).sort((a, b) => {
                    const dateA = parseISO(a.waktu_koreksi || a.waktu_verifikasi || a.waktu_registrasi || a.waktu_input);
                    const dateB = parseISO(b.waktu_koreksi || b.waktu_verifikasi || b.waktu_registrasi || b.waktu_input);
                    return dateB.getTime() - dateA.getTime();
                });

                setTimelineActivities(sortedData as TimelineActivity[]);
            } catch (error: any) {
                console.error('Error fetching timeline activities:', error.message);
                toast.error('Gagal memuat linimasa aktivitas: ' + error.message);
                setTimelineActivities([]);
            }
        };

        if (!sessionLoading && user) {
            fetchTagihanCounts();
            fetchTimelineActivities();
        }
    }, [user, sessionLoading]);

    const getLatestActivityDate = (activity: TimelineActivity) => {
        const dates = [
            activity.waktu_koreksi,
            activity.waktu_verifikasi,
            activity.waktu_registrasi,
            activity.waktu_input,
        ].filter(Boolean).map(dateStr => parseISO(dateStr!));

        if (dates.length === 0) return null;
        return dates.reduce((latest, current) => (current > latest ? current : latest));
    };

    if (sessionLoading || dataLoading) {
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
                            Sedang mengambil data tagihan Anda...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent mb-2 pb-1 inline-block">
                    Selamat Datang, {profile?.nama_lengkap || user?.email}!
                </h1>
                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span className="inline-flex items-center">
                        {animatedText}
                        <span className="inline-block w-0.5 h-5 bg-emerald-500 ml-1 animate-pulse"></span>
                    </span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                {/* Total Tagihan Card */}
                <Card
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Semua Status')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-100"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-white/90">Total Tagihan</CardTitle>
                        <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                            <ReceiptTextIcon className="h-5 w-5 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold text-white mb-1">
                            {counts?.total}
                        </div>
                        <p className="text-xs text-white/80 font-medium">
                            Total Semua Tagihan
                        </p>
                        <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <ReceiptTextIcon className="h-24 w-24 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Menunggu Registrasi Card */}
                <Card
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Menunggu Registrasi')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-100"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-white/90">Menunggu Registrasi</CardTitle>
                        <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                            <HourglassIcon className="h-5 w-5 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold text-white mb-1">
                            {counts?.menungguRegistrasi}
                        </div>
                        <p className="text-xs text-white/80 font-medium">
                            Belum Diregistrasi
                        </p>
                        <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <HourglassIcon className="h-24 w-24 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Menunggu Verifikasi Card */}
                <Card
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Menunggu Verifikasi')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-100"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-white/90">Menunggu Verifikasi</CardTitle>
                        <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                            <FileCheckIcon className="h-5 w-5 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold text-white mb-1">
                            {counts?.menungguVerifikasi}
                        </div>
                        <p className="text-xs text-white/80 font-medium">
                            Sedang Diverifikasi
                        </p>
                        <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <FileCheckIcon className="h-24 w-24 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Diteruskan Card */}
                <Card
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Diteruskan')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-100"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-white/90">Diteruskan</CardTitle>
                        <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                            <SendIcon className="h-5 w-5 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold text-white mb-1">
                            {counts?.diteruskan}
                        </div>
                        <p className="text-xs text-white/80 font-medium">
                            Berhasil Diteruskan
                        </p>
                        <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <SendIcon className="h-24 w-24 text-white" />
                        </div>
                    </CardContent>
                </Card>

                {/* Dikembalikan Card */}
                <Card
                    className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Dikembalikan')}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-600 opacity-100"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-rose-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-white/90">Dikembalikan</CardTitle>
                        <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                            <RotateCcwIcon className="h-5 w-5 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold text-white mb-1">
                            {counts?.dikembalikan}
                        </div>
                        <p className="text-xs text-white/80 font-medium">
                            Perlu Perbaikan
                        </p>
                        <div className="absolute bottom-0 right-0 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                            <RotateCcwIcon className="h-24 w-24 text-white" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline Activities */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                            <ClockIcon className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Linimasa Aktivitas Terbaru
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {timelineActivities.length === 0 ? (
                        <p className="text-center text-gray-600 dark:text-slate-400 py-4">Tidak ada aktivitas tagihan terbaru.</p>
                    ) : (
                        <ol className="relative border-l-2 border-emerald-200 dark:border-emerald-800 ml-4">
                            {timelineActivities.map((activity) => {
                                const latestDate = getLatestActivityDate(activity);
                                const relativeTime = latestDate ? formatDistanceToNow(latestDate, { addSuffix: true, locale: localeId }) : '-';

                                let message = '';
                                let statusColor = 'text-gray-500';
                                let StatusIcon = ReceiptTextIcon; // Default icon
                                let iconBgColor = 'bg-gray-100 dark:bg-gray-800';
                                let iconColor = 'text-gray-600 dark:text-gray-400';

                                switch (activity.status_tagihan) {
                                    case 'Menunggu Registrasi':
                                        message = `Anda baru saja menginput tagihan ${activity.nomor_spm}.`;
                                        statusColor = 'text-amber-600 dark:text-amber-400';
                                        StatusIcon = HourglassIcon;
                                        iconBgColor = 'bg-amber-100 dark:bg-amber-950/50';
                                        iconColor = 'text-amber-600 dark:text-amber-400';
                                        break;
                                    case 'Menunggu Verifikasi':
                                        message = `Tagihan ${activity.nomor_spm} Anda telah diregistrasi.`;
                                        statusColor = 'text-indigo-600 dark:text-indigo-400';
                                        StatusIcon = FileCheckIcon;
                                        iconBgColor = 'bg-indigo-100 dark:bg-indigo-950/50';
                                        iconColor = 'text-indigo-600 dark:text-indigo-400';
                                        break;
                                    case 'Diteruskan':
                                        message = `Tagihan ${activity.nomor_spm} Anda telah Diteruskan.`;
                                        statusColor = 'text-emerald-600 dark:text-emerald-400';
                                        StatusIcon = SendIcon;
                                        iconBgColor = 'bg-emerald-100 dark:bg-emerald-950/50';
                                        iconColor = 'text-emerald-600 dark:text-emerald-400';
                                        break;
                                    case 'Dikembalikan':
                                        message = `Tagihan ${activity.nomor_spm} Anda telah Dikembalikan.`;
                                        statusColor = 'text-rose-600 dark:text-rose-400';
                                        StatusIcon = RotateCcwIcon;
                                        iconBgColor = 'bg-rose-100 dark:bg-rose-950/50';
                                        iconColor = 'text-rose-600 dark:text-rose-400';
                                        break;
                                    case 'Tinjau Kembali':
                                        message = `Tagihan ${activity.nomor_spm} Anda Perlu Ditinjau Kembali.`;
                                        statusColor = 'text-purple-600 dark:text-purple-400';
                                        StatusIcon = RotateCcwIcon;
                                        iconBgColor = 'bg-purple-100 dark:bg-purple-950/50';
                                        iconColor = 'text-purple-600 dark:text-purple-400';
                                        break;
                                    default:
                                        message = `Aktivitas tidak diketahui untuk tagihan ${activity.nomor_spm}.`;
                                        break;
                                }

                                return (
                                    <li key={activity.id_tagihan} className="mb-6 ml-6">
                                        <span className="absolute flex items-center justify-center w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full -left-1.5 ring-8 ring-white dark:ring-slate-900"></span>
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${iconBgColor} flex-shrink-0`}>
                                                <StatusIcon className={`h-4 w-4 ${iconColor}`} />
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <p className={`text-sm font-normal ${statusColor}`}>
                                                    {message}
                                                </p>
                                                <time className="text-xs font-normal text-gray-400 dark:text-slate-500">
                                                    {relativeTime}
                                                </time>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardSKPD;
