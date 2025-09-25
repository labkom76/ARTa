import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface TagihanCounts {
  total: number;
  menungguRegistrasi: number;
  menungguVerifikasi: number;
  diteruskan: number;
  dikembalikan: number;
}

const DashboardSKPD = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [counts, setCounts] = useState<TagihanCounts | null>(null);
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

    if (!sessionLoading && user) {
      fetchTagihanCounts();
    }
  }, [user, sessionLoading]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tagihan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Registrasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.menungguRegistrasi}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.menungguVerifikasi}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diteruskan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.diteruskan}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dikembalikan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts?.dikembalikan}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardSKPD;