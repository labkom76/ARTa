import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ReceiptTextIcon, HourglassIcon, FileCheckIcon, SendIcon, RotateCcwIcon, Sparkles } from 'lucide-react';
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

                // Total Tagihan
                const { count: totalCount, error: totalError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId);

                if (totalError) throw totalError;

                // Menunggu Registrasi
                const { count: menungguRegistrasiCount, error: menungguRegistrasiError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Menunggu Registrasi');

                if (menungguRegistrasiError) throw menungguRegistrasiError;

                // Menunggu Verifikasi
                const { count: menungguVerifikasiCount, error: menungguVerifikasiError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Menunggu Verifikasi');

                if (menungguVerifikasiError) throw menungguVerifikasiError;

                // Diteruskan
                const { count: diteruskanCount, error: diteruskanError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Diteruskan');

                if (diteruskanError) throw diteruskanError;

                // Dikembalikan
                const { count: dikembalikanCount, error: dikembalikanError } = await supabase
                    .from('database_tagihan')
                    .select('*', { count: 'exact', head: true })
                    .eq('id_pengguna_input', userId)
                    .eq('status_tagihan', 'Dikembalikan');

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
                const { data, error } = await supabase
                    .from('database_tagihan')
                    .select('id_tagihan, nomor_spm, status_tagihan, waktu_input, waktu_registrasi, waktu_verifikasi, waktu_koreksi')
                    .eq('id_pengguna_input', user.id)
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
            <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-gray-200 dark:border-slate-800 transition-colors duration-200">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4">Memuat Dashboard...</h1>
                <p className="text-gray-600 dark:text-slate-400">Sedang mengambil data tagihan Anda.</p>
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
                <Card
                    className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Semua Status')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Tagihan</CardTitle>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                            <ReceiptTextIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{counts?.total}</div>
                    </CardContent>
                </Card>

                <Card
                    className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500 bg-gradient-to-br from-white to-yellow-50/30 dark:from-slate-900 dark:to-yellow-950/20 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Menunggu Registrasi')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Menunggu Registrasi</CardTitle>
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-950/50 rounded-lg">
                            <HourglassIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{counts?.menungguRegistrasi}</div>
                    </CardContent>
                </Card>

                <Card
                    className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Menunggu Verifikasi')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Menunggu Verifikasi</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
                            <FileCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{counts?.menungguVerifikasi}</div>
                    </CardContent>
                </Card>

                <Card
                    className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Diteruskan')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Diteruskan</CardTitle>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
                            <SendIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{counts?.diteruskan}</div>
                    </CardContent>
                </Card>

                <Card
                    className="shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500 bg-gradient-to-br from-white to-red-50/30 dark:from-slate-900 dark:to-red-950/20 cursor-pointer"
                    onClick={() => navigate('/portal-skpd?status=Dikembalikan')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dikembalikan</CardTitle>
                        <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
                            <RotateCcwIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700 dark:text-red-400">{counts?.dikembalikan}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline Activities */}
            <Card className="shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-800/30">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Linimasa Aktivitas Terbaru</CardTitle>
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
                                switch (activity.status_tagihan) {
                                    case 'Menunggu Registrasi':
                                        message = `Anda baru saja menginput tagihan ${activity.nomor_spm}.`;
                                        statusColor = 'text-amber-600 dark:text-amber-400';
                                        break;
                                    case 'Menunggu Verifikasi':
                                        message = `Tagihan ${activity.nomor_spm} Anda telah diregistrasi.`;
                                        statusColor = 'text-indigo-600 dark:text-indigo-400';
                                        break;
                                    case 'Diteruskan':
                                        message = `Tagihan ${activity.nomor_spm} Anda telah Diteruskan.`;
                                        statusColor = 'text-emerald-600 dark:text-emerald-400';
                                        break;
                                    case 'Dikembalikan':
                                        message = `Tagihan ${activity.nomor_spm} Anda telah Dikembalikan.`;
                                        statusColor = 'text-rose-600 dark:text-rose-400';
                                        break;
                                    case 'Tinjau Kembali':
                                        message = `Tagihan ${activity.nomor_spm} Anda Perlu Ditinjau Kembali.`;
                                        statusColor = 'text-purple-600 dark:text-purple-400';
                                        break;
                                    default:
                                        message = `Aktivitas tidak diketahui untuk tagihan ${activity.nomor_spm}.`;
                                        break;
                                }

                                return (
                                    <li key={activity.id_tagihan} className="mb-6 ml-6">
                                        <span className="absolute flex items-center justify-center w-3 h-3 bg-emerald-500 dark:bg-emerald-400 rounded-full -left-1.5 ring-8 ring-white dark:ring-slate-900"></span>
                                        <div className="flex flex-col">
                                            <p className={`text-sm font-normal ${statusColor}`}>
                                                {message}
                                            </p>
                                            <time className="text-xs font-normal text-gray-400 dark:text-slate-500">
                                                {relativeTime}
                                            </time>
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
