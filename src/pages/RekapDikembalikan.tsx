import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  nomor_koreksi?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
}

const RekapDikembalikan = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchRekapDikembalikan = async () => {
      if (!user || sessionLoading || profile?.peran !== 'Staf Koreksi') {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        const { data, error } = await supabase
          .from('database_tagihan')
          .select('id_tagihan, nama_skpd, nomor_spm, nomor_koreksi, waktu_koreksi, catatan_koreksi')
          .eq('id_korektor', user.id) // Filter by current user's ID
          .order('waktu_koreksi', { ascending: false }); // Order by most recent correction

        if (error) throw error;
        setTagihanList(data as Tagihan[]);
      } catch (error: any) {
        console.error('Error fetching rekap dikembalikan:', error.message);
        toast.error('Gagal memuat rekap tagihan dikembalikan: ' + error.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchRekapDikembalikan();
  }, [user, profile, sessionLoading]);

  if (sessionLoading || loadingData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Koreksi') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Rekap Tagihan Dikembalikan</h1>

      {/* Area Kontrol Filter (Kosong) */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filter Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            Area untuk kontrol filter (akan diimplementasikan nanti)
          </div>
        </CardContent>
      </Card>

      {/* Tabel Riwayat */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Tagihan Dikembalikan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu Koreksi</TableHead>
                  <TableHead>Nomor Koreksi</TableHead>
                  <TableHead>Nomor SPM</TableHead>
                  <TableHead>Nama SKPD</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagihanList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Tidak ada data tagihan dikembalikan.
                    </TableCell>
                  </TableRow>
                ) : (
                  tagihanList.map((tagihan) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell>
                        {tagihan.waktu_koreksi ? format(parseISO(tagihan.waktu_koreksi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{tagihan.nomor_koreksi || '-'}</TableCell>
                      <TableCell>{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell>{tagihan.catatan_koreksi || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RekapDikembalikan;