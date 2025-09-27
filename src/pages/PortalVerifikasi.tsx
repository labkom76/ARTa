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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { FileCheckIcon, LockIcon } from 'lucide-react';
import VerifikasiTagihanDialog from '@/components/VerifikasiTagihanDialog'; // Import the new dialog component

interface VerificationItem {
  item: string;
  memenuhi_syarat: boolean;
  keterangan: string;
}

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
  nomor_registrasi?: string;
  waktu_registrasi?: string;
  nama_registrator?: string;
  catatan_verifikator?: string;
  waktu_verifikasi?: string;
  detail_verifikasi?: VerificationItem[];
  nomor_verifikasi?: string;
  nama_verifikator?: string;
  locked_by?: string; // Add locked_by to Tagihan interface
  locked_at?: string; // Add locked_at to Tagihan interface
}

const PortalVerifikasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [queueTagihanList, setQueueTagihanList] = useState<Tagihan[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [isVerifikasiModalOpen, setIsVerifikasiModalOpen] = useState(false);
  const [selectedTagihanForVerifikasi, setSelectedTagihanForVerifikasi] = useState<Tagihan | null>(null);

  const fetchQueueTagihan = async () => {
    if (sessionLoading || profile?.peran !== 'Staf Verifikator') {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('database_tagihan')
        .select('*')
        .eq('status_tagihan', 'Menunggu Verifikasi')
        .order('waktu_registrasi', { ascending: true });

      if (error) throw error;
      setQueueTagihanList(data as Tagihan[]);
    } catch (error: any) {
      console.error('Error fetching queue tagihan:', error.message);
      toast.error('Gagal memuat antrian verifikasi: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchQueueTagihan();

    const channel = supabase
      .channel('portal-verifikasi-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'database_tagihan',
        },
        (payload) => {
          const oldTagihan = payload.old as Tagihan;
          const newTagihan = payload.new as Tagihan;

          // Update the list based on changes
          setQueueTagihanList(prevList => {
            const updatedList = prevList.filter(t => t.id_tagihan !== newTagihan.id_tagihan);

            // If status changed from 'Menunggu Verifikasi' or locked by another user
            if (
              (oldTagihan.status_tagihan === 'Menunggu Verifikasi' && newTagihan.status_tagihan !== 'Menunggu Verifikasi') ||
              (newTagihan.locked_by !== null && newTagihan.locked_by !== user?.id)
            ) {
              if (prevList.some(t => t.id_tagihan === newTagihan.id_tagihan)) {
                toast.info(`Tagihan ${newTagihan.nomor_spm} telah diambil atau diproses.`);
              }
              return updatedList;
            }
            // If unlocked and still 'Menunggu Verifikasi', add it back if not already present
            else if (
              newTagihan.locked_by === null &&
              newTagihan.status_tagihan === 'Menunggu Verifikasi' &&
              !prevList.some(t => t.id_tagihan === newTagihan.id_tagihan)
            ) {
              toast.info(`Tagihan ${newTagihan.nomor_spm} tersedia kembali.`);
              return [...updatedList, newTagihan].sort((a, b) =>
                (a.waktu_registrasi || '').localeCompare(b.waktu_registrasi || '')
              );
            }
            // If it's an update to a locked_by by the current user, keep it in the list (it's being processed)
            // Or if it's an update to other fields but still 'Menunggu Verifikasi' and not locked by others
            else if (
              newTagihan.status_tagihan === 'Menunggu Verifikasi' &&
              (newTagihan.locked_by === user?.id || newTagihan.locked_by === null)
            ) {
              // If it's already in the list, update it. Otherwise, add it.
              const existingIndex = prevList.findIndex(t => t.id_tagihan === newTagihan.id_tagihan);
              if (existingIndex > -1) {
                const newList = [...prevList];
                newList[existingIndex] = newTagihan;
                return newList;
              } else {
                return [...prevList, newTagihan].sort((a, b) =>
                  (a.waktu_registrasi || '').localeCompare(b.waktu_registrasi || '')
                );
              }
            }
            return prevList;
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionLoading, profile, user]);

  const handleProcessVerification = async (tagihan: Tagihan) => {
    if (!user) {
      toast.error('Anda harus login untuk memproses verifikasi.');
      return;
    }

    // Coba mengunci tagihan
    try {
      const { data, error } = await supabase
        .from('database_tagihan')
        .update({
          locked_by: user.id,
          locked_at: new Date().toISOString(),
        })
        .eq('id_tagihan', tagihan.id_tagihan)
        .is('locked_by', null) // Hanya kunci jika belum dikunci
        .select(); // Penting untuk mendapatkan data yang diperbarui

      if (error) throw error;

      if (data && data.length > 0) {
        // Penguncian berhasil
        setSelectedTagihanForVerifikasi(data[0] as Tagihan); // Gunakan data yang diperbarui
        setIsVerifikasiModalOpen(true);
      } else {
        // Penguncian gagal (sudah dikunci oleh orang lain)
        toast.error('Gagal: Tagihan ini sedang diproses oleh verifikator lain.');
        // No need to fetchQueueTagihan here, real-time subscription will handle it
      }
    } catch (error: any) {
      console.error('Error acquiring lock:', error.message);
      toast.error('Gagal mengunci tagihan: ' + error.message);
    }
  };

  const handleCloseVerifikasiModal = async () => {
    setIsVerifikasiModalOpen(false);
    if (selectedTagihanForVerifikasi && user) {
      try {
        // Coba membuka kunci tagihan jika dikunci oleh pengguna saat ini
        // dan statusnya masih 'Menunggu Verifikasi' (belum diproses)
        const { data, error } = await supabase
          .from('database_tagihan')
          .update({ locked_by: null, locked_at: null })
          .eq('id_tagihan', selectedTagihanForVerifikasi.id_tagihan)
          .eq('locked_by', user.id)
          .eq('status_tagihan', 'Menunggu Verifikasi') // Only unlock if still in queue
          .select();

        if (error) {
          console.error('Error unlocking tagihan:', error.message);
        } else if (data && data.length > 0) {
          toast.info(`Tagihan ${selectedTagihanForVerifikasi.nomor_spm} telah dibuka kuncinya.`);
        }
      } catch (error) {
        console.error('Error during unlock attempt:', error);
      }
    }
    // No need to fetchQueueTagihan here, real-time subscription will handle it
    setSelectedTagihanForVerifikasi(null);
  };

  if (sessionLoading || loadingData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Verifikator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Portal Verifikasi Tagihan</h1>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor Registrasi</TableHead>
              <TableHead>Waktu Registrasi</TableHead>
              <TableHead>Nomor SPM</TableHead>
              <TableHead>Nama SKPD</TableHead>
              <TableHead>Jumlah Kotor</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queueTagihanList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Tidak ada tagihan di antrian verifikasi.
                </TableCell>
              </TableRow>
            ) : (
              queueTagihanList.map((tagihan) => (
                <TableRow key={tagihan.id_tagihan}>
                  <TableCell className="font-medium">{tagihan.nomor_registrasi || '-'}</TableCell>
                  <TableCell>
                    {tagihan.waktu_registrasi ? format(parseISO(tagihan.waktu_registrasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                  </TableCell>
                  <TableCell>{tagihan.nomor_spm}</TableCell>
                  <TableCell>{tagihan.nama_skpd}</TableCell>
                  <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={tagihan.locked_by ? "Tagihan ini sedang diproses" : "Proses Verifikasi"}
                      onClick={() => handleProcessVerification(tagihan)}
                      disabled={!!tagihan.locked_by}
                    >
                      {tagihan.locked_by ? (
                        <LockIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <FileCheckIcon className="h-5 w-5 text-blue-500" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <VerifikasiTagihanDialog
        isOpen={isVerifikasiModalOpen}
        onClose={handleCloseVerifikasiModal}
        tagihan={selectedTagihanForVerifikasi}
      />
    </div>
  );
};

export default PortalVerifikasi;