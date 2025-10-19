import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { SearchIcon, CheckCircleIcon, EyeIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import RegistrasiConfirmationDialog from '@/components/RegistrasiConfirmationDialog';
import TagihanDetailDialog from '@/components/TagihanDetailDialog'; // Import the detail dialog
import StatusBadge from '@/components/StatusBadge'; // Import StatusBadge
import { Label } from '@/components/ui/label'; // Import Label for "Per halaman"

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
}

const PortalRegistrasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [queueTagihanList, setQueueTagihanList] = useState<Tagihan[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingQueuePagination, setLoadingQueuePagination] = useState(false); // New state for queue pagination loading
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 700);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [skpdOptions, setSkpdOptions] = useState<string[]>([]);
  const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');

  const [isRegistrasiModalOpen, setIsRegistrasiModalOpen] = useState(false);
  const [selectedTagihanForRegistrasi, setSelectedTagihanForRegistrasi] = useState<Tagihan | null>(null);
  const [generatedNomorRegistrasi, setGeneratedNomorRegistrasi] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // State for Queue Table Pagination
  const [queueCurrentPage, setQueueCurrentPage] = useState(1);
  const [queueItemsPerPage, setQueueItemsPerPage] = useState(10);
  const [queueTotalItems, setQueueTotalItems] = useState(0);

  // State for History Table Pagination
  const [historyTagihanList, setHistoryTagihanList] = useState<Tagihan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);

  // State for Detail Dialog
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  // Refs to track previous values for determining pagination-only changes
  const prevQueueSearchQuery = useRef(searchQuery);
  const prevSelectedSkpd = useRef(selectedSkpd);
  const prevQueueItemsPerPage = useRef(queueItemsPerPage);
  const prevQueueCurrentPage = useRef(queueCurrentPage);

  // Effect untuk memfokuskan kembali input pencarian setelah data dimuat
  useEffect(() => {
    if (!loadingQueue && debouncedSearchQuery && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loadingQueue, debouncedSearchQuery]);

  // Fetch unique SKPD names for the dropdown, filtered by 'Menunggu Registrasi' status
  useEffect(() => {
    const fetchSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('database_tagihan')
          .select('nama_skpd')
          .eq('status_tagihan', 'Menunggu Registrasi');

        if (error) throw error;

        const uniqueSkpd = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '');

        setSkpdOptions(['Semua SKPD', ...uniqueSkpd.sort()]);
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

  // Fetch Tagihan with 'Menunggu Registrasi' status and apply search/SKPD filters
  const fetchQueueTagihan = async (isPaginationOnlyChange = false) => {
    if (!user || sessionLoading || profile?.peran !== 'Staf Registrasi') {
      setLoadingQueue(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingQueue(true); // Show full loading spinner for search/filter changes
    } else {
      setLoadingQueuePagination(true); // Only disable pagination buttons for page changes
    }

    try {
      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' }) // Add count for pagination
        .eq('status_tagihan', 'Menunggu Registrasi');

      if (debouncedSearchQuery) {
        query = query.ilike('nomor_spm', `%${debouncedSearchQuery}%`);
      }

      if (selectedSkpd !== 'Semua SKPD') {
        query = query.eq('nama_skpd', selectedSkpd);
      }

      query = query.order('waktu_input', { ascending: true });

      if (queueItemsPerPage !== -1) { // Apply range only if not 'All'
        query = query.range(
          (queueCurrentPage - 1) * queueItemsPerPage,
          queueCurrentPage * queueItemsPerPage - 1
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setQueueTagihanList(data as Tagihan[]);
      setQueueTotalItems(count || 0); // Set total items for pagination
    } catch (error: any) {
      console.error('Error fetching queue tagihan:', error.message);
      toast.error('Gagal memuat antrian tagihan: ' + error.message);
    } finally {
      if (!isPaginationOnlyChange) {
        setLoadingQueue(false);
      } else {
        setLoadingQueuePagination(false);
      }
    }
  };

  // Fetch History Tagihan (last 24 hours, status 'Menunggu Verifikasi')
  const fetchHistoryTagihan = async () => {
    if (!user || sessionLoading || profile?.peran !== 'Staf Registrasi') {
      setLoadingHistory(false);
      return;
    }

    setLoadingHistory(true);
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' })
        .eq('nama_registrator', profile?.nama_lengkap) // Filter by the current logged-in staff's name
        .gte('waktu_registrasi', twentyFourHoursAgo);

      query = query.order('waktu_registrasi', { ascending: false });

      if (historyItemsPerPage !== -1) { // Apply range only if not 'All'
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
      toast.error('Gagal memuat riwayat tagihan: ' + error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Main useEffect to trigger queue data fetching
  useEffect(() => {
    let isPaginationOnlyChange = false;
    // Check if only queueCurrentPage changed, while other filters/search/itemsPerPage remained the same
    if (
      prevQueueCurrentPage.current !== queueCurrentPage &&
      prevQueueSearchQuery.current === searchQuery &&
      prevSelectedSkpd.current === selectedSkpd &&
      prevQueueItemsPerPage.current === queueItemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchQueueTagihan(isPaginationOnlyChange);

    // Update refs for the next render cycle
    prevQueueSearchQuery.current = searchQuery;
    prevSelectedSkpd.current = selectedSkpd;
    prevQueueItemsPerPage.current = queueItemsPerPage;
    prevQueueCurrentPage.current = queueCurrentPage;

  }, [user, sessionLoading, debouncedSearchQuery, selectedSkpd, queueCurrentPage, queueItemsPerPage, profile]);

  useEffect(() => {
    fetchHistoryTagihan(); // Fetch history data
  }, [user, sessionLoading, profile, historyCurrentPage, historyItemsPerPage]);

  const generateNomorRegistrasi = async (): Promise<string> => {
    const now = new Date();
    const yearMonthDay = format(now, 'yyyyMMdd');
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    const endOfCurrentMonth = endOfMonth(now).toISOString();

    const { data, error } = await supabase
      .from('database_tagihan')
      .select('nomor_registrasi')
      .not('nomor_registrasi', 'is', null)
      .gte('waktu_registrasi', startOfCurrentMonth)
      .lte('waktu_registrasi', endOfCurrentMonth)
      .order('nomor_registrasi', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last registration number:', error.message);
      throw new Error('Gagal membuat nomor registrasi.');
    }

    let nextSequence = 1;
    if (data && data.length > 0 && data[0].nomor_registrasi) {
      const lastNomor = data[0].nomor_registrasi;
      const parts = lastNomor.split('-');
      if (parts.length === 3) {
        const lastSequenceStr = parts[2];
        const lastSequenceNum = parseInt(lastSequenceStr, 10);
        if (!isNaN(lastSequenceNum)) {
          nextSequence = lastSequenceNum + 1;
        }
      }
    }

    const formattedSequence = String(nextSequence).padStart(4, '0');
    return `REG-${yearMonthDay}-${formattedSequence}`;
  };

  const handleRegistrasiClick = async (tagihan: Tagihan) => {
    if (!profile?.nama_lengkap) {
      toast.error('Nama registrator tidak ditemukan. Harap lengkapi profil Anda.');
      return;
    }
    setSelectedTagihanForRegistrasi(tagihan);
    setIsRegistrasiModalOpen(true);
    setGeneratedNomorRegistrasi(null); // Reset before generating
    try {
      const newNomor = await generateNomorRegistrasi();
      setGeneratedNomorRegistrasi(newNomor);
    } catch (error: any) {
      toast.error(error.message);
      setIsRegistrasiModalOpen(false);
    }
  };

  const confirmRegistrasi = async (tagihanId: string, nomorRegistrasi: string) => {
    setIsConfirming(true);
    try {
      // Update tagihan status
      const { error: updateError } = await supabase
        .from('database_tagihan')
        .update({
          status_tagihan: 'Menunggu Verifikasi',
          nomor_registrasi: nomorRegistrasi,
          waktu_registrasi: new Date().toISOString(),
          nama_registrator: profile?.nama_lengkap,
        })
        .eq('id_tagihan', tagihanId);

      if (updateError) throw updateError;

      // Fetch the updated tagihan to get id_pengguna_input
      const { data: updatedTagihan, error: fetchTagihanError } = await supabase
        .from('database_tagihan')
        .select('nomor_spm, id_pengguna_input')
        .eq('id_tagihan', tagihanId)
        .single();

      if (fetchTagihanError) throw fetchTagihanError;
      if (!updatedTagihan) throw new Error('Tagihan tidak ditemukan setelah update.');

      // Insert notification for the SKPD user
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: updatedTagihan.id_pengguna_input,
          message: `Tagihan SPM ${updatedTagihan.nomor_spm} Anda telah diregistrasi.`,
          is_read: false,
          tagihan_id: tagihanId, // Include tagihan_id
        });

      if (notificationError) {
        console.error('Error inserting notification:', notificationError.message);
        // Don't throw error here, as tagihan update is more critical
      }

      toast.success('Tagihan berhasil diregistrasi!');
      setIsRegistrasiModalOpen(false);
      fetchQueueTagihan(); // Refresh the queue list
      fetchHistoryTagihan(); // Refresh the history list
    } catch (error: any) {
      console.error('Error confirming registrasi:', error.message);
      toast.error('Gagal mengkonfirmasi registrasi: ' + error.message);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDetailClick = (tagihan: Tagihan) => {
    setSelectedTagihanForDetail(tagihan);
    setIsDetailModalOpen(true);
  };

  const queueTotalPages = queueItemsPerPage === -1 ? 1 : Math.ceil(queueTotalItems / queueItemsPerPage);
  const historyTotalPages = historyItemsPerPage === -1 ? 1 : Math.ceil(historyTotalItems / historyItemsPerPage);

  if (sessionLoading || loadingQueue || loadingHistory) {
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

      {/* Antrian Registrasi Panel */}
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Antrian Registrasi</h2>

        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Cari Nomor SPM..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select onValueChange={setSelectedSkpd} value={selectedSkpd}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter SKPD" />
              </SelectTrigger>
              <SelectContent>
                {skpdOptions.map((skpd) => (
                  <SelectItem key={skpd} value={skpd}>
                    {skpd}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2"> {/* Moved to top right */}
            <label htmlFor="queue-items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</label>
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

        {loadingQueue && !loadingQueuePagination ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Memuat antrian...</p>
        ) : queueTagihanList.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan ditemukan dengan status 'Menunggu Registrasi' atau sesuai pencarian/filter Anda.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
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
                  {queueTagihanList.map((tagihan, index) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell>{(queueCurrentPage - 1) * queueItemsPerPage + index + 1}</TableCell>
                      <TableCell>{format(parseISO(tagihan.waktu_input), 'dd MMMM yyyy HH:mm', { locale: localeId })}</TableCell>
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
                          onClick={() => handleRegistrasiClick(tagihan)}
                          disabled={isConfirming}
                        >
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Custom Pagination for Queue Table */}
            <div className="mt-4 flex items-center justify-end space-x-4">
              <div className="text-sm text-muted-foreground">
                Halaman {queueTotalItems === 0 ? 0 : queueCurrentPage} dari {queueTotalPages} ({queueTotalItems} total item)
              </div>
              <Button
                variant="outline"
                onClick={() => setQueueCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={queueCurrentPage === 1 || queueItemsPerPage === -1 || loadingQueuePagination}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                onClick={() => setQueueCurrentPage((prev) => Math.min(queueTotalPages, prev + 1))}
                disabled={queueCurrentPage === queueTotalPages || queueItemsPerPage === -1 || loadingQueuePagination}
              >
                Berikutnya
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Riwayat Registrasi Panel */}
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">Riwayat Registrasi (24 Jam Terakhir)</h2>

        <div className="mb-4 flex justify-end items-center space-x-2">
          <label htmlFor="history-items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Per halaman:</label>
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
          <p className="text-center text-gray-600 dark:text-gray-400">Memuat riwayat registrasi...</p>
        ) : historyTagihanList.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada riwayat registrasi dalam 24 jam terakhir.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead>Waktu Registrasi</TableHead>
                    <TableHead>Nomor Registrasi</TableHead>
                    <TableHead>Nomor SPM</TableHead>
                    <TableHead>Nama SKPD</TableHead>
                    <TableHead>Jumlah Kotor</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyTagihanList.map((tagihan, index) => (
                    <TableRow key={tagihan.id_tagihan}>
                      <TableCell>{(historyCurrentPage - 1) * historyItemsPerPage + index + 1}</TableCell>
                      <TableCell>{format(parseISO(tagihan.waktu_registrasi!), 'dd MMMM yyyy HH:mm', { locale: localeId })}</TableCell>
                      <TableCell className="font-medium">{tagihan.nomor_registrasi}</TableCell>
                      <TableCell>{tagihan.nomor_spm}</TableCell>
                      <TableCell>{tagihan.nama_skpd}</TableCell>
                      <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Lihat Detail"
                          onClick={() => handleDetailClick(tagihan)}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
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
      </div>

      <RegistrasiConfirmationDialog
        isOpen={isRegistrasiModalOpen}
        onClose={() => setIsRegistrasiModalOpen(false)}
        onConfirm={confirmRegistrasi}
        tagihan={selectedTagihanForRegistrasi}
        generatedNomorRegistrasi={generatedNomorRegistrasi}
        isConfirming={isConfirming}
      />

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />
    </div>
  );
};

export default PortalRegistrasi;