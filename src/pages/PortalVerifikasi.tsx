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
import VerifikasiTagihanDialog from '@/components/VerifikasiTagihanDialog';

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
  locked_by?: string;
  locked_at?: string;
}

const LOCK_TIMEOUT_MINUTES = 30; // Define lock timeout: 30 minutes

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

          const now = new Date();
          const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000);

          // Determine if the new tagihan should be visible in the queue
          const shouldBeVisible =
            newTagihan.status_tagihan === 'Menunggu Verifikasi' &&
            (newTagihan.locked_by === null || // Not locked
             newTagihan.locked_by === user?.id || // Locked by current user
             (newTagihan.locked_at && parseISO(newTagihan.locked_at).getTime() < lockTimeoutThreshold.getTime())); // Stale locked

          setQueueTagihanList(prevList => {
            let updatedList = prevList.filter(t => t.id_tagihan !== newTagihan.id_tagihan); // Remove old version

            if (shouldBeVisible) {
              updatedList.push(newTagihan); // Add the new version
              // Add toasts for state changes
              if (oldTagihan.status_tagihan !== 'Menunggu Verifikasi' && newTagihan.status_tagihan === 'Menunggu Verifikasi') {
                toast.info(`Tagihan ${newTagihan.nomor_spm} kembali ke antrian.`);
              } else if (oldTagihan.locked_by !== null && newTagihan.locked_by === null) {
                toast.info(`Tagihan ${newTagihan.nomor_spm} tersedia kembali (kunci dilepas).`);
              } else if (oldTagihan.locked_by !== null && newTagihan.locked_by !== null && newTagihan.locked_by !== user?.id &&
                         (!oldTagihan.locked_at || parseISO(oldTagihan.locked_at).getTime() >= lockTimeoutThreshold.getTime()) && // Was not stale
                         (newTagihan.locked_at && parseISO(newTagihan.locked_at).getTime() < lockTimeoutThreshold.getTime())) { // Now stale
                toast.info(`Tagihan ${newTagihan.nomor_spm} tersedia kembali (kunci kadaluarsa).`);
              }
            } else {
              // If it should NOT be visible, and it was previously visible, show a toast
              if (prevList.some(t => t.id_tagihan === newTagihan.id_tagihan)) {
                if (newTagihan.status_tagihan !== 'Menunggu Verifikasi') {
                  toast.info(`Tagihan ${newTagihan.nomor_spm} telah diverifikasi.`);
                } else if (newTagihan.locked_by !== null && newTagihan.locked_by !== user?.id &&
                           (newTagihan.locked_at && parseISO(newTagihan.locked_at).getTime() >= lockTimeoutThreshold.getTime())) {
                  toast.info(`Tagihan ${newTagihan.nomor_spm} sedang diproses oleh verifikator lain.`);
                }
              }
            }

            return updatedList.sort((a, b) =>
              (a.waktu_registrasi || '').localeCompare(b.waktu_registrasi || '')
            );
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

    try {
      const now = new Date();
      const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

      // Attempt to lock the tagihan.
      // It will succeed if:
      // 1. It's not locked (locked_by is null)
      // 2. It's locked by the current user (re-locking after a refresh, for example)
      // 3. It's locked by another user, but the lock has expired (locked_at is older than threshold)
      const { data, error } = await supabase
        .from('database_tagihan')
        .update({
          locked_by: user.id,
          locked_at: now.toISOString(),
        })
        .eq('id_tagihan', tagihan.id_tagihan)
        .or(
          `locked_by.is.null,locked_by.eq.${user.id},and(locked_by.neq.${user.id},locked_at.lt.${lockTimeoutThreshold})`
        )
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        // Lock acquired successfully
        setSelectedTagihanForVerifikasi(data[0] as Tagihan);
        setIsVerifikasiModalOpen(true);
        toast.success(`Tagihan ${data[0].nomor_spm} berhasil dikunci.`);
      } else {
        // Lock failed (already locked by someone else and not stale)
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
        // Only unlock if the tagihan is still in 'Menunggu Verifikasi' status
        // and was locked by the current user.
        // This prevents unlocking if it was already processed or locked by someone else.
        const { error } = await supabase
          .from('database_tagihan')
          .update({ locked_by: null, locked_at: null })
          .eq('id_tagihan', selectedTagihanForVerifikasi.id_tagihan)
          .eq('locked_by', user.id)
          .eq('status_tagihan', 'Menunggu Verifikasi'); // Crucial: only unlock if still in queue

        if (error) {
          console.error('Error unlocking tagihan:', error.message);
        } else {
          // If the update was successful (meaning it was unlocked by this user and was still in queue)
          // the real-time subscription will handle re-adding it to other users' lists.
          // No explicit toast here, as the real-time will trigger one for others.
        }
      } catch (error) {
        console.error('Error during unlock attempt:', error);
      }
    }
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
              queueTagihanList.map((tagihan) => {
                const isLockedByOther = tagihan.locked_by && tagihan.locked_by !== user?.id;
                const isStaleLock = tagihan.locked_at && (new Date().getTime() - parseISO(tagihan.locked_at).getTime()) > LOCK_TIMEOUT_MINUTES * 60 * 1000;

                const isDisabled = isLockedByOther && !isStaleLock;

                return (
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
                        title={isDisabled ? "Tagihan ini sedang diproses oleh verifikator lain" : "Proses Verifikasi"}
                        onClick={() => handleProcessVerification(tagihan)}
                        disabled={isDisabled}
                      >
                        {isDisabled ? (
                          <LockIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <FileCheckIcon className="h-5 w-5 text-blue-500" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
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