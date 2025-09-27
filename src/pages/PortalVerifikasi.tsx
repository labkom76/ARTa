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
import { format, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { FileCheckIcon, LockIcon, EyeIcon, PrinterIcon } from 'lucide-react';
import VerifikasiTagihanDialog from '@/components/VerifikasiTagihanDialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TagihanDetailDialog from '@/components/TagihanDetailDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [loadingQueue, setLoadingQueue] = useState(true);

  const [historyTagihanList, setHistoryTagihanList] = useState<Tagihan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);

  const [isVerifikasiModalOpen, setIsVerifikasiModalOpen] = useState(false);
  const [selectedTagihanForVerifikasi, setSelectedTagihanForVerifikasi] = useState<Tagihan | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  const fetchQueueTagihan = async () => {
    if (sessionLoading || profile?.peran !== 'Staf Verifikator') {
      setLoadingQueue(false);
      return;
    }

    setLoadingQueue(true);
    try {
      const now = new Date();
      const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

      let query = supabase
        .from('database_tagihan')
        .select('*')
        .eq('status_tagihan', 'Menunggu Verifikasi')
        .order('waktu_registrasi', { ascending: true });

      query = query.or(
        `locked_by.is.null,locked_by.eq.${user?.id},locked_at.lt.${lockTimeoutThreshold}`
      );

      const { data, error } = await query;

      if (error) throw error;
      setQueueTagihanList(data as Tagihan[]);
    } catch (error: any) {
      console.error('Error fetching queue tagihan:', error.message);
      toast.error('Gagal memuat antrian verifikasi: ' + error.message);
    } finally {
      setLoadingQueue(false);
    }
  };

  const fetchHistoryTagihan = async () => {
    if (sessionLoading || profile?.peran !== 'Staf Verifikator') {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' })
        .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
        .gte('waktu_verifikasi', todayStart)
        .lte('waktu_verifikasi', todayEnd)
        .order('waktu_verifikasi', { ascending: false });

      if (historyItemsPerPage !== -1) {
        query = query.range(
          (historyCurrentPage - 1) * historyItemsPerPage,
          historyCurrentPage * historyItemsPerPage - 1
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setHistoryTagihanList(data as Tagihan[]);
      setHistoryTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error fetching history tagihan:', error.message);
      toast.error('Gagal memuat riwayat verifikasi: ' + error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchQueueTagihan();
    fetchHistoryTagihan();

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

          setQueueTagihanList(prevList => {
            const existingIndex = prevList.findIndex(t => t.id_tagihan === newTagihan.id_tagihan);
            let updatedList = [...prevList];

            const isCurrentlyInQueue =
              newTagihan.status_tagihan === 'Menunggu Verifikasi' &&
              (newTagihan.locked_by === null ||
               newTagihan.locked_by === user?.id ||
               (newTagihan.locked_at && parseISO(newTagihan.locked_at).getTime() < lockTimeoutThreshold.getTime()));

            if (isCurrentlyInQueue) {
              if (existingIndex > -1) {
                updatedList[existingIndex] = newTagihan;
              } else {
                updatedList.push(newTagihan);
                if (oldTagihan.locked_by !== null && newTagihan.locked_by === null) {
                    toast.info(`Tagihan ${newTagihan.nomor_spm} tersedia kembali.`);
                }
              }
            } else {
              if (existingIndex > -1) {
                updatedList.splice(existingIndex, 1);
                if (newTagihan.status_tagihan !== 'Menunggu Verifikasi') {
                    toast.info(`Tagihan ${newTagihan.nomor_spm} telah diverifikasi.`);
                } else if (newTagihan.locked_by !== null && newTagihan.locked_by !== user?.id) {
                    toast.info(`Tagihan ${newTagihan.nomor_spm} sedang diproses oleh verifikator lain.`);
                }
              }
            }
            return updatedList.sort((a, b) => (a.waktu_registrasi || '').localeCompare(b.waktu_registrasi || ''));
          });

          setHistoryTagihanList(prevList => {
            const isVerifiedToday = newTagihan.waktu_verifikasi &&
                                    isSameDay(parseISO(newTagihan.waktu_verifikasi), new Date()) &&
                                    (newTagihan.status_tagihan === 'Diteruskan' || newTagihan.status_tagihan === 'Dikembalikan');
            const existingHistoryIndex = prevList.findIndex(t => t.id_tagihan === newTagihan.id_tagihan);
            let updatedHistoryList = [...prevList];

            if (isVerifiedToday) {
              if (existingHistoryIndex > -1) {
                updatedHistoryList[existingHistoryIndex] = newTagihan;
              } else {
                updatedHistoryList.unshift(newTagihan);
              }
            } else {
              if (existingHistoryIndex > -1) {
                updatedHistoryList.splice(existingHistoryIndex, 1);
              }
            }
            return updatedHistoryList.sort((a, b) => (b.waktu_verifikasi || '').localeCompare(a.waktu_verifikasi || ''));
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [sessionLoading, profile, user, historyCurrentPage, historyItemsPerPage]);

  const handleProcessVerification = async (tagihan: Tagihan) => {
    if (!user) {
      toast.error('Anda harus login untuk memproses verifikasi.');
      return;
    }

    try {
      const now = new Date();
      const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

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
        setSelectedTagihanForVerifikasi(data[0] as Tagihan);
        setIsVerifikasiModalOpen(true);
        toast.success(`Tagihan ${data[0].nomor_spm} berhasil dikunci.`);
      } else {
        toast.error('Gagal: Tagihan ini sedang diproses oleh verifikator lain.');
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
        const { error } = await supabase
          .from('database_tagihan')
          .update({ locked_by: null, locked_at: null })
          .eq('id_tagihan', selectedTagihanForVerifikasi.id_tagihan)
          .eq('locked_by', user.id)
          .eq('status_tagihan', 'Menunggu Verifikasi');

        if (error) {
          console.error('Error unlocking tagihan:', error.message);
        }
      } catch (error) {
        console.error('Error during unlock attempt:', error);
      }
    }
    setSelectedTagihanForVerifikasi(null);
  };

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

  const historyTotalPages = historyItemsPerPage === -1 ? 1 : Math.ceil(historyTotalItems / historyItemsPerPage);

  if (sessionLoading || loadingQueue || loadingHistory) {
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
    <div className="space-y-6"> {/* Main container for spacing between sections */}
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Portal Verifikasi Tagihan</h1>

      {/* Antrian Verifikasi Panel */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-white">Antrian Verifikasi</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Riwayat Verifikasi Hari Ini Panel */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-white">Riwayat Verifikasi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end items-center space-x-2">
            <label htmlFor="history-items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</label>
            <Select
              value={historyItemsPerPage.toString()}
              onValueChange={(value) => {
                setHistoryItemsPerPage(Number(value));
                setHistoryCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="-1">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingHistory ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Memuat riwayat verifikasi...</p>
          ) : historyTagihanList.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada riwayat verifikasi hari ini.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu Verifikasi</TableHead>
                      <TableHead>Nomor Verifikasi</TableHead>
                      <TableHead>Nama SKPD</TableHead> {/* New TableHead */}
                      <TableHead>Nomor SPM</TableHead>
                      <TableHead>Status Tagihan</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyTagihanList.map((tagihan) => (
                      <TableRow key={tagihan.id_tagihan}>
                        <TableCell>
                          {tagihan.waktu_verifikasi ? format(parseISO(tagihan.waktu_verifikasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{tagihan.nomor_verifikasi || '-'}</TableCell>
                        <TableCell>{tagihan.nama_skpd}</TableCell> {/* New TableCell */}
                        <TableCell>{tagihan.nomor_spm}</TableCell>
                        <TableCell>{tagihan.status_tagihan}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" title="Cetak">
                              <PrinterIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setHistoryCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={historyCurrentPage === 1 || historyItemsPerPage === -1}
                    />
                  </PaginationItem>
                  {[...Array(historyTotalPages)].map((_, index) => (
                    <PaginationItem key={index}>
                      <PaginationLink
                        isActive={historyCurrentPage === index + 1}
                        onClick={() => setHistoryCurrentPage(index + 1)}
                        disabled={historyItemsPerPage === -1}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setHistoryCurrentPage((prev) => Math.min(historyTotalPages, prev + 1))}
                      disabled={historyCurrentPage === historyTotalPages || historyItemsPerPage === -1}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>

      <VerifikasiTagihanDialog
        isOpen={isVerifikasiModalOpen}
        onClose={handleCloseVerifikasiModal}
        tagihan={selectedTagihanForVerifikasi}
      />

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />
    </div>
  );
};

export default PortalVerifikasi;