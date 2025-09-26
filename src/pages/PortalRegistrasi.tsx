import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SearchIcon, CheckCircleIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';

interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  jenis_spm: string;
  jenis_tagihan: string;
  uraian: string;
  jumlah_kotor: number;
  status_tagihan: string;
  waktu_input: string;
  id_pengguna_input: string;
}

const PortalRegistrasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [queueTagihanList, setQueueTagihanList] = useState<Tagihan[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Fetch ALL Tagihan for testing connection
  useEffect(() => {
    const fetchAllTagihan = async () => {
      if (!user || sessionLoading || profile?.peran !== 'Staf Registrasi') {
        setLoadingQueue(false);
        return;
      }

      setLoadingQueue(true);
      try {
        // Fetch ALL data without any filters
        const { data, error } = await supabase
          .from('database_tagihan')
          .select('*')
          .order('waktu_input', { ascending: true });

        if (error) throw error;
        setQueueTagihanList(data as Tagihan[]);
      } catch (error: any) {
        console.error('Error fetching all tagihan:', error.message);
        toast.error('Gagal memuat semua tagihan: ' + error.message);
      } finally {
        setLoadingQueue(false);
      }
    };
    fetchAllTagihan();
  }, [user, sessionLoading, profile]); // Dependencies for re-fetching

  if (sessionLoading || loadingQueue) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Portal Registrasi...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang mengambil data untuk Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Registrasi') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Portal Registrasi</h1>

      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Antrian Registrasi</h2>

        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              type="text"
              placeholder="Cari Nomor SPM..."
              className="pl-9"
              disabled // Disabled as per instruction to focus on raw data display
            />
          </div>
        </div>

        {loadingQueue ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Memuat antrian...</p>
        ) : queueTagihanList.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan ditemukan.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu Input</TableHead>
                  <TableHead>Nama SKPD</TableHead>
                  <TableHead>Nomor SPM</TableHead>
                  <TableHead>Jenis SPM</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead>Jumlah Kotor</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueTagihanList.map((tagihan) => (
                  <TableRow key={tagihan.id_tagihan}>
                    <TableCell>{format(parseISO(tagihan.waktu_input), 'dd MMMM yyyy HH:mm', { locale: id })}</TableCell>
                    <TableCell className="font-medium">{tagihan.nama_skpd}</TableCell>
                    <TableCell>{tagihan.nomor_spm}</TableCell>
                    <TableCell>{tagihan.jenis_spm}</TableCell>
                    <TableCell>{tagihan.uraian}</TableCell>
                    <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Registrasi Tagihan"
                      >
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalRegistrasi;