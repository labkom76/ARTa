import React, { useEffect, useState, useRef } from 'react';
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
import { FileCheckIcon, LockIcon, EyeIcon, PrinterIcon, SearchIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useDebounce from '@/hooks/use-debounce';
import KoreksiTagihanSidePanel from '@/components/KoreksiTagihanSidePanel'; // Import the new component
import StatusBadge from '@/components/StatusBadge'; // Import StatusBadge

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
  nomor_koreksi?: string;
  id_korektor?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
}

const LOCK_TIMEOUT_MINUTES = 30; // Define lock timeout: 30 minutes

const PortalVerifikasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [queueTagihanList, setQueueTagihanList] = useState<Tagihan[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const debouncedQueueSearchQuery = useDebounce(queueSearchQuery, 500);
  const [queueSkpdOptions, setQueueSkpdOptions] = useState<string[]>([]);
  const [selectedQueueSkpd, setSelectedQueueSkpd] = useState<string>('Semua SKPD');

  // State for Queue Table Pagination
  const [queueCurrentPage, setQueueCurrentPage] = useState(1);
  const [queueItemsPerPage, setQueueItemsPerPage] = useState(10);
  const [queueTotalItems, setQueueTotalItems] = useState(0);

  const [historyTagihanList, setHistoryTagihanList] = useState<Tagihan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState(''); // New state for history search
  const debouncedHistorySearchQuery = useDebounce(historySearchQuery, 500); // Debounced history search
  const [historySkpdOptions, setHistorySkpdOptions] = useState<string[]>([]); // New state for history SKPD options
  const [selectedHistorySkpd, setSelectedHistorySkpd] = useState<string>('Semua SKPD'); // New state for selected history SKPD
  const [historyPanelTitle, setHistoryPanelTitle] = useState('Riwayat Verifikasi Hari Ini'); // Dynamic title for history panel

  // State for History Table Pagination (added to resolve ReferenceError)
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);

  const [isVerifikasiModalOpen, setIsVerifikasiModalOpen] = useState(false);
  const [selectedTagihanForVerifikasi, setSelectedTagihanForVerifikasi] = useState<Tagihan | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  // New states for Koreksi Side Panel
  const [isKoreksiSidePanelOpen, setIsKoreksiSidePanelOpen] = useState(false);
  const [selectedTagihanForKoreksi, setSelectedTagihanForKoreksi] = useState<Tagihan | null>(null);

  // Fetch unique SKPD names for the queue filter dropdown
  useEffect(() => {
    const fetchQueueSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('database_tagihan')
          .select('nama_skpd')
          .eq('status_tagihan', 'Menunggu Verifikasi');

        if (error) throw error;

        const uniqueSkpd = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '');

        setQueueSkpdOptions(['Semua SKPD', ...uniqueSkpd.sort()]);
      } catch (error: any) {
        console.error('Error fetching queue SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD untuk antrian: ' + error.message);
      }
    };
    fetchQueueSkpdOptions();
  }, []);

  // Fetch unique SKPD names for the history filter dropdown
  useEffect(() => {
    if (!user || !profile?.peran) return;

    const fetchHistorySkpdOptions = async () => {
      try {
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();

        let query = supabase
          .from('database_tagihan')
          .select('nama_skpd');
        
        if (profile.peran === 'Staf Verifikator') {
          query = query
            .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
            .gte('waktu_verifikasi', todayStart)
            .lte('waktu_verifikasi', todayEnd)
            .is('id_korektor', null);
        } else if (profile.peran === 'Staf Koreksi') {
          query = query
            .eq('status_tagihan', 'Dikembalikan')
            .eq('id_korektor', user.id)
            .gte('waktu_koreksi', todayStart)
            .lte('waktu_koreksi', todayEnd);
        } else {
          // Default for other roles or if no specific filter needed
          query = query
            .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
            .gte('waktu_verifikasi', todayStart)
            .lte('waktu_verifikasi', todayEnd);
        }

        const { data, error } = await query;

        if (error) throw error;

        const uniqueSkpd = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '');

        setHistorySkpdOptions(['Semua SKPD', ...uniqueSkpd.sort()]);
      } catch (error: any) {
        console.error('Error fetching history SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD untuk riwayat: ' + error.message);
      }
    };
    fetchHistorySkpdOptions();
  }, [profile?.peran, user]); // Add profile.peran and user to dependencies

  const fetchQueueTagihan = async () => {
    if (sessionLoading || (profile?.peran !== 'Staf Verifikator' && profile?.peran !== 'Staf Koreksi')) {
      setLoadingQueue(false);
      return;
    }

    setLoadingQueue(true);
    try {
      const now = new Date();
      const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' })
        .eq('status_tagihan', 'Menunggu Verifikasi')
        .order('waktu_registrasi', { ascending: true });

      query = query.or(
        `locked_by.is.null,locked_by.eq.${user?.id},locked_at.lt.${lockTimeoutThreshold}`
      );

      if (debouncedQueueSearchQuery) {
        query = query.or(
          `nomor_spm.ilike.%${debouncedQueueSearchQuery}%,nama_skpd.ilike.%${debouncedQueueSearchQuery}%`
        );
      }

      if (selectedQueueSkpd !== 'Semua SKPD') {
        query = query.eq('nama_skpd', selectedQueueSkpd);
      }

      if (queueItemsPerPage !== -1) {
        query = query.range(
          (queueCurrentPage - 1) * queueItemsPerPage,
          queueCurrentPage * queueItemsPerPage - 1
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setQueueTagihanList(data as Tagihan[]);
      setQueueTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error fetching queue tagihan:', error.message);
      toast.error('Gagal memuat antrian verifikasi: ' + error.message);
    } finally {
      setLoadingQueue(false);
    }
  };

  const fetchHistoryTagihan = async () => {
    if (sessionLoading || !user || !profile?.peran) {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' });

      if (profile.peran === 'Staf Verifikator') {
        setHistoryPanelTitle('Riwayat Verifikasi Hari Ini');
        query = query
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd)
          .is('id_korektor', null); // Filter for Staf Verifikasi
        query = query.order('waktu_verifikasi', { ascending: false });
      } else if (profile.peran === 'Staf Koreksi') {
        setHistoryPanelTitle('Pengembalian Terakhir Anda');
        query = query
          .eq('status_tagihan', 'Dikembalikan')
          .eq('id_korektor', user.id) // Filter for Staf Koreksi
          .gte('waktu_koreksi', todayStart)
          .lte('waktu_koreksi', todayEnd);
        query = query.order('waktu_koreksi', { ascending: false });
      } else {
        // Fallback for other roles, or if no specific filter is needed
        setHistoryPanelTitle('Riwayat Verifikasi Hari Ini');
        query = query
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);
        query = query.order('waktu_verifikasi', { ascending: false });
      }

      // Apply history search query
      if (debouncedHistorySearchQuery) {
        query = query.or(
          `nomor_spm.ilike.%${debouncedHistorySearchQuery}%,nama_skpd.ilike.%${debouncedHistorySearchQuery}%`
        );
      }

      // Apply history SKPD filter
      if (selectedHistorySkpd !== 'Semua SKPD') {
        query = query.eq('nama_skpd', selectedHistorySkpd);
      }

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

  // Fungsi baru untuk menangani keberhasilan verifikasi atau koreksi
  const handleActionSuccess = () => {
    fetchQueueTagihan(); // Perbarui daftar antrian
    fetchHistoryTagihan(); // Perbarui daftar riwayat
  };

  useEffect(() => {
    fetchQueueTagihan();
  }, [user, sessionLoading, profile, debouncedQueueSearchQuery, selectedQueueSkpd, queueCurrentPage, queueItemsPerPage]);

  useEffect(() => {
    fetchHistoryTagihan();
  }, [user, sessionLoading, profile, debouncedHistorySearchQuery, selectedHistorySkpd, historyCurrentPage, historyItemsPerPage]);

  useEffect(() => {
    const channel = supabase
      .channel('portal-verifikasi-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Listen for updates
          schema: 'public',
          table: 'database_tagihan',
        },
        (payload) => {
          const oldTagihan = payload.old as Tagihan;
          const newTagihan = payload.new as Tagihan;
          console.log('Realtime UPDATE received:', newTagihan); // Debug log

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
                updatedList[existingIndex] = newTagihan; // Update existing item
              } else {
                updatedList.push(newTagihan); // Add new item to queue
                toast.info(`Tagihan ${newTagihan.nomor_spm} baru masuk antrian verifikasi.`);
              }
            } else {
              if (existingIndex > -1) {
                updatedList.splice(existingIndex, 1); // Remove from queue
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

            // Apply conditional filter for 'Staf Verifikator' in realtime updates
            const shouldBeInHistoryForVerifier = isVerifiedToday && (profile?.peran !== 'Staf Verifikator' || newTagihan.id_korektor === null);
            const shouldBeInHistoryForKoreksi = newTagihan.waktu_koreksi &&
                                                isSameDay(parseISO(newTagihan.waktu_koreksi), new Date()) &&
                                                newTagihan.status_tagihan === 'Dikembalikan' &&
                                                newTagihan.id_korektor === user?.id;

            if (profile?.peran === 'Staf Verifikator' && shouldBeInHistoryForVerifier) {
              if (existingHistoryIndex > -1) {
                updatedHistoryList[existingHistoryIndex] = newTagihan;
              } else {
                updatedHistoryList.unshift(newTagihan);
              }
            } else if (profile?.peran === 'Staf Koreksi' && shouldBeInHistoryForKoreksi) {
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
            return updatedHistoryList.sort((a, b) => (b.waktu_verifikasi || b.waktu_koreksi || '').localeCompare(a.waktu_verifikasi || a.waktu_koreksi || ''));
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

  // New handler for the action button click
  const handleActionButtonClick = async (tagihan: Tagihan) => {
    if (!user || !profile?.peran) {
      toast.error('Anda harus login untuk memproses tagihan.');
      return;
    }

    if (profile.peran === 'Staf Verifikator') {
      await handleProcessVerification(tagihan);
    } else if (profile.peran === 'Staf Koreksi') {
      setSelectedTagihanForKoreksi(tagihan);
      setIsKoreksiSidePanelOpen(true);
    } else {
      toast.error('Peran Anda tidak memiliki izin untuk aksi ini.');
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

  const handleCloseKoreksiSidePanel = () => {
    setIsKoreksiSidePanelOpen(false);
    setSelectedTagihanForKoreksi(null);
    // No unlock logic needed here for now, as KoreksiTagihanSidePanel is static.
    // If Koreksi becomes interactive and involves locking, add unlock logic here.
  };

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

  const handlePrintClick = (tagihanId: string) => {
    if (profile?.peran === 'Staf Koreksi') {
      const printWindow = window.open(`/print-koreksi?id=${tagihanId}`, '_blank', 'width=800,height=900,scrollbars=yes');
      if (printWindow) {
        printWindow.focus();
      } else {
        toast.error('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.');
      }
    } else if (profile?.peran === 'Staf Verifikator') {
      const printWindow = window.open(`/print-verifikasi?id=${tagihanId}`, '_blank', 'width=800,height=900,scrollbars=yes');
      if (printWindow) {
        printWindow.focus();
      } else {
        toast.error('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.');
      }
    } else {
      toast.error('Peran Anda tidak memiliki izin untuk mencetak.');
    }
  };

  const queueTotalPages = queueItemsPerPage === -1 ? 1 : Math.ceil(queueTotalItems / queueItemsPerPage);
  const historyTotalPages = historyItemsPerPage === -1 ? 1 : Math.ceil(historyTotalItems / historyItemsPerPage);

  if (sessionLoading || loadingQueue || loadingHistory) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
      </div>
    );
  }

  // Updated access check to include 'Staf Koreksi'
  if (profile?.peran !== 'Staf Verifikator' && profile?.peran !== 'Staf Koreksi') {
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
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 w-full sm:w-auto">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari Nomor SPM atau Nama SKPD..."
                  className="pl-9 w-full"
                  value={queueSearchQuery}
                  onChange={(e) => {
                    setQueueSearchQuery(e.target.value);
                    setQueueCurrentPage(1); // Reset page on search
                  }}
                />
              </div>
              <Select onValueChange={(value) => { setSelectedQueueSkpd(value); setQueueCurrentPage(1); }} value={selectedQueueSkpd}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter SKPD" />
                </SelectTrigger>
                <SelectContent>
                  {queueSkpdOptions.map((skpd) => (
                    <SelectItem key={skpd} value={skpd}>
                      {skpd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="queue-items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
              <Select
                value={queueItemsPerPage.toString()}
                onValueChange={(value) => {
                  setQueueItemsPerPage(Number(value));
                  setQueueCurrentPage(1);
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
          </div>

          {loadingQueue ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Memuat antrian...</p>
          ) : queueTagihanList.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan di antrian verifikasi.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">No.</TableHead> {/* New TableHead for "No." */}
                      <TableHead>Nomor Registrasi</TableHead>
                      <TableHead>Waktu Registrasi</TableHead>
                      <TableHead>Nomor SPM</TableHead>
                      <TableHead>Nama SKPD</TableHead>
                      <TableHead>Jumlah Kotor</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueTagihanList.map((tagihan, index) => {
                      const isLockedByOther = tagihan.locked_by && tagihan.locked_by !== user?.id;
                      const isStaleLock = tagihan.locked_at && (new Date().getTime() - parseISO(tagihan.locked_at).getTime()) > LOCK_TIMEOUT_MINUTES * 60 * 1000;

                      const isDisabled = isLockedByOther && !isStaleLock;

                      return (
                        <TableRow key={tagihan.id_tagihan}>
                          <TableCell>{(queueCurrentPage - 1) * queueItemsPerPage + index + 1}</TableCell> {/* New TableCell for numbering */}
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
                              onClick={() => handleActionButtonClick(tagihan)} // Use the new handler
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
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                <div className="text-sm text-muted-foreground">
                  Halaman {queueTotalItems === 0 ? 0 : queueCurrentPage} dari {queueTotalPages} ({queueTotalItems} total item)
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setQueueCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={queueCurrentPage === 1 || queueItemsPerPage === -1}
                      />
                    </PaginationItem>
                    {[...Array(queueTotalPages)].map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          isActive={queueCurrentPage === index + 1}
                          onClick={() => setQueueCurrentPage(index + 1)}
                          disabled={queueItemsPerPage === -1}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setQueueCurrentPage((prev) => Math.min(queueTotalPages, prev + 1))}
                        disabled={queueCurrentPage === queueTotalPages || queueItemsPerPage === -1}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Riwayat Verifikasi Hari Ini Panel */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-white">{historyPanelTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 w-full sm:w-auto">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari Nomor SPM atau Nama SKPD..."
                  className="pl-9 w-full"
                  value={historySearchQuery}
                  onChange={(e) => {
                    setHistorySearchQuery(e.target.value);
                    setHistoryCurrentPage(1); // Reset page on search
                  }}
                />
              </div>
              <Select onValueChange={(value) => { setSelectedHistorySkpd(value); setHistoryCurrentPage(1); }} value={selectedHistorySkpd}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter SKPD" />
                </SelectTrigger>
                <SelectContent>
                  {historySkpdOptions.map((skpd) => (
                    <SelectItem key={skpd} value={skpd}>
                      {skpd}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="history-items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
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
                      <TableHead className="w-[50px]">No.</TableHead> {/* New TableHead for "No." */}
                      <TableHead>{profile?.peran === 'Staf Koreksi' ? 'Waktu Koreksi' : 'Waktu Verifikasi'}</TableHead>
                      <TableHead>{profile?.peran === 'Staf Koreksi' ? 'Nomor Koreksi' : 'Nomor Verifikasi'}</TableHead>
                      <TableHead>Nama SKPD</TableHead>
                      <TableHead>Nomor SPM</TableHead>
                      <TableHead>Status Tagihan</TableHead>
                      <TableHead className="text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyTagihanList.map((tagihan, index) => (
                      <TableRow key={tagihan.id_tagihan}>
                        <TableCell>{(historyCurrentPage - 1) * historyItemsPerPage + index + 1}</TableCell> {/* New TableCell for numbering */}
                        <TableCell>
                          {profile?.peran === 'Staf Koreksi'
                            ? (tagihan.waktu_koreksi ? format(parseISO(tagihan.waktu_koreksi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-')
                            : (tagihan.waktu_verifikasi ? format(parseISO(tagihan.waktu_verifikasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {profile?.peran === 'Staf Koreksi' ? (tagihan.nomor_koreksi || '-') : (tagihan.nomor_verifikasi || '-')}
                        </TableCell>
                        <TableCell>{tagihan.nama_skpd}</TableCell>
                        <TableCell>{tagihan.nomor_spm}</TableCell>
                        <TableCell><StatusBadge status={tagihan.status_tagihan} /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" title="Cetak" onClick={() => handlePrintClick(tagihan.id_tagihan)}>
                              <PrinterIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                <div className="text-sm text-muted-foreground">
                  Halaman {historyTotalItems === 0 ? 0 : historyCurrentPage} dari {historyTotalPages} ({historyTotalItems} total item)
                </div>
                <Pagination>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <VerifikasiTagihanDialog
        isOpen={isVerifikasiModalOpen}
        onClose={handleCloseVerifikasiModal}
        onVerificationSuccess={handleActionSuccess}
        tagihan={selectedTagihanForVerifikasi}
      />

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />

      <KoreksiTagihanSidePanel
        isOpen={isKoreksiSidePanelOpen}
        onClose={handleCloseKoreksiSidePanel}
        onCorrectionSuccess={handleActionSuccess} // Pass the new prop
        tagihan={selectedTagihanForKoreksi}
      />
    </div>
  );
};

export default PortalVerifikasi;