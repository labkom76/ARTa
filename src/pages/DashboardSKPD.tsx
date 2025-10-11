import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ReceiptTextIcon, HourglassIcon, FileCheckIcon, SendIcon, RotateCcwIcon } from 'lucide-react'; // Import icons
import { format, parseISO, formatDistanceToNow } from 'date-fns'; // Import format, parseISO, and formatDistanceToNow
import { id as localeId } from 'date-fns/locale'; // Import locale for Indonesian date formatting

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
  const { user, profile, loading: sessionLoading } = useSession();
  const [counts, setCounts] = useState<TagihanCounts | null>(null);
  const [timelineActivities, setTimelineActivities] = useState<TimelineActivity[]>([]); // New state for timeline
  const [dataLoading, setDataLoading] = useState(true);

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

    // --- NEW FUNCTION: Fetch Timeline Activities ---
    const fetchTimelineActivities = async () => {
      if (!user || sessionLoading) return;

      try {
        const { data, error } = await supabase
          .from('database_tagihan')
          .select('id_tagihan, nomor_spm, status_tagihan, waktu_input, waktu_registrasi, waktu_verifikasi, waktu_koreksi')
          .eq('id_pengguna_input', user.id)
          .order('waktu_koreksi', { ascending: false, nullsFirst: false }) // Prioritize waktu_koreksi
          .order('waktu_verifikasi', { ascending: false, nullsFirst: false }) // Then waktu_verifikasi
          .order('waktu_registrasi', { ascending: false, nullsFirst: false }) // Then waktu_registrasi
          .order('waktu_input', { ascending: false, nullsFirst: false }) // Finally waktu_input
          .limit(5);

        if (error) throw error;

        // DEBUG: Log raw data
        console.log("RAW TIMELINE DATA:", data); 

        // Sort manually by the latest available date if Supabase's multiple order doesn't yield desired COALESCE behavior
        const sortedData = (data || []).sort((a, b) => {
          const dateA = parseISO(a.waktu_koreksi || a.waktu_verifikasi || a.waktu_registrasi || a.waktu_input);
          const dateB = parseISO(b.waktu_koreksi || b.waktu_verifikasi || b.waktu_registrasi || b.waktu_input);
          return dateB.getTime() - dateA.getTime(); // Descending order
        });

        setTimelineActivities(sortedData as TimelineActivity[]);
      } catch (error: any) {
        console.error('Error fetching timeline activities:', error.message);
        toast.error('Gagal memuat linimasa aktivitas: ' + error.message);
        setTimelineActivities([]);
      }
    };
    // --- END NEW FUNCTION ---

    if (!sessionLoading && user) {
      fetchTagihanCounts();
      fetchTimelineActivities(); // Call the new function
    }
  }, [user, sessionLoading]);

  const getLatestActivityDate = (activity: TimelineActivity) => {
    const dates = [
      activity.waktu_koreksi,
      activity.waktu_verifikasi,
      activity.waktu_registrasi,
      activity.waktu_input,
    ].filter(Boolean).map(dateStr => parseISO(dateStr!)); // Filter out undefined/null and parse

    if (dates.length === 0) return null;
    return dates.reduce((latest, current) => (current > latest ? current : latest));
  };

  if (sessionLoading || dataLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Dashboard...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang mengambil data tagihan Anda.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        Selamat Datang, {profile?.nama_lengkap || user?.email}!
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Saat ini Anda masuk sebagai {profile?.peran || 'Pengguna'} pada {profile?.asal_skpd || 'Tidak Diketahui'}.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tagihan</CardTitle>
            <ReceiptTextIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Registrasi</CardTitle>
            <HourglassIcon className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.menungguRegistrasi}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
            <FileCheckIcon className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.menungguVerifikasi}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diteruskan</CardTitle>
            <SendIcon className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.diteruskan}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dikembalikan</CardTitle>
            <RotateCcwIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.dikembalikan}</div>
          </CardContent>
        </Card>
      </div>

      {/* New Card for Timeline Activities */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">Linimasa Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineActivities.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada aktivitas tagihan terbaru.</p>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-4">
              {timelineActivities.map((activity, index) => {
                const latestDate = getLatestActivityDate(activity);
                const relativeTime = latestDate ? formatDistanceToNow(latestDate, { addSuffix: true, locale: localeId }) : '-';
                
                let message = '';
                let statusColor = 'text-gray-500'; // Default color
                switch (activity.status_tagihan) {
                  case 'Menunggu Registrasi':
                    message = `Anda baru saja menginput tagihan ${activity.nomor_spm}.`;
                    statusColor = 'text-yellow-600 dark:text-yellow-400';
                    break;
                  case 'Menunggu Verifikasi':
                    message = `Tagihan ${activity.nomor_spm} Anda telah diregistrasi.`;
                    statusColor = 'text-purple-600 dark:text-purple-400';
                    break;
                  case 'Diteruskan':
                    message = `Tagihan ${activity.nomor_spm} Anda telah Diteruskan.`;
                    statusColor = 'text-green-600 dark:text-green-400';
                    break;
                  case 'Dikembalikan':
                    message = `Tagihan ${activity.nomor_spm} Anda telah Dikembalikan.`;
                    statusColor = 'text-red-600 dark:text-red-400';
                    break;
                  default:
                    message = `Aktivitas tidak diketahui untuk tagihan ${activity.nomor_spm}.`;
                    break;
                }

                return (
                  <li key={activity.id_tagihan} className="mb-6 ml-6">
                    <span className="absolute flex items-center justify-center w-3 h-3 bg-blue-200 rounded-full -left-1.5 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900"></span>
                    
                    {/* Gabungkan pesan dan waktu di sini */}
                    <div className="flex flex-col">
                      <p className={`text-sm font-normal ${statusColor}`}>
                        {message}
                      </p>
                      <time className="text-xs font-normal text-gray-400 dark:text-gray-500">
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