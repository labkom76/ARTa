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
import { format, parseISO, startOfDay, endOfDay, isSameDay, formatDistanceToNow } from 'date-fns'; // Import formatDistanceToNow
import { id as localeId } from 'date-fns/locale';
import { FileCheckIcon, LockIcon, EyeIcon, PrinterIcon, SearchIcon, FilePenLine } from 'lucide-react'; // Import FilePenLine icon
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
import { Combobox } from '@/components/ui/combobox'; // Import Combobox
import Countdown from 'react-countdown'; // Import Countdown
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams

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
  tenggat_perbaikan?: string; // NEW: Add tenggat_perbaikan
}

interface SkpdOption { // Define interface for SKPD options
  value: string;
  label: string;
}

const LOCK_TIMEOUT_MINUTES = 30; // Define lock timeout: 30 minutes

const PortalVerifikasi = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [queueTagihanList, setQueueTagihanList] = useState<Tagihan[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingQueuePagination, setLoadingQueuePagination] = useState(false); // New state for queue pagination loading
  const [queueSearchQuery, setQueueSearchQuery] = useState('');
  const debouncedQueueSearchQuery = useDebounce(queueSearchQuery, 500);
  
  // MODIFIED: Renamed and changed type for Combobox
  const [skpdOptionsAntrian, setSkpdOptionsAntrian] = useState<SkpdOption[]>([]);
  const [selectedSkpdAntrian, setSelectedSkpdAntrian] = useState<string>('Semua SKPD');

  // State for Queue Table Pagination
  const [queueCurrentPage, setQueueCurrentPage] = useState(1);
  const [queueItemsPerPage, setQueueItemsPerPage] = useState(10);
  const [queueTotalItems, setQueueTotalItems] = useState(0);

  const [historyTagihanList, setHistoryTagihanList] = useState<Tagihan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingHistoryPagination, setLoadingHistoryPagination] = useState(false); // New state for history pagination loading
  const [historySearchQuery, setHistorySearchQuery] = useState(''); // New state for history search
  const debouncedHistorySearchQuery = useDebounce(historySearchQuery, 500); // Debounced history search
  // MODIFIED: Changed type to SkpdOption[] and renamed for clarity
  const [skpdOptionsHistory, setSkpdOptionsHistory] = useState<SkpdOption[]>([]); 
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

  // Refs to track previous values for determining pagination-only changes
  const prevQueueSearchQueryRef = useRef(queueSearchQuery);
  const prevSelectedSkpdAntrianRef = useRef(selectedSkpdAntrian); // MODIFIED: Ref for new SKPD state
  const prevQueueItemsPerPageRef = useRef(queueItemsPerPage);
  const prevQueueCurrentPageRef = useRef(queueCurrentPage);

  const prevHistorySearchQueryRef = useRef(historySearchQuery);
  const prevSelectedHistorySkpdRef = useRef(selectedHistorySkpd);
  const prevHistoryItemsPerPageRef = useRef(historyItemsPerPage);
  const prevHistoryCurrentPageRef = useRef(historyCurrentPage);

  const [searchParams, setSearchParams] = useSearchParams(); // Initialize useSearchParams and its setter

  // Fetch unique SKPD names for the queue filter dropdown (MODIFIED)
  useEffect(() => {
    const fetchSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('master_skpd') // Fetch from master_skpd
          .select('nama_skpd')
          .order('nama_skpd', { ascending: true });

        if (error) throw error;

        const uniqueSkpd: SkpdOption[] = Array.from(new Set(data.map(item => item.nama_skpd)))
          .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '')
          .map(skpd => ({ value: skpd, label: skpd }));

        setSkpdOptionsAntrian([{ value: 'Semua SKPD', label: 'Semua SKPD' }, ...uniqueSkpd]);
        setSkpdOptionsHistory([{ value: 'Semua SKPD', label: 'Semua SKPD' }, ...uniqueSkpd]); // Set for history as well
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };
    fetchSkpdOptions();
  }, []);

  // Removed redundant fetchHistorySkpdOptions useEffect as it's now combined with fetchSkpdOptions

  const fetchQueueTagihan = async (isPaginationOnlyChange = false) => {
    if (sessionLoading || (profile?.peran !== 'Staf Verifikator' && profile?.peran !== 'Staf Koreksi')) {
      setLoadingQueue(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingQueue(true); // Show full loading spinner for search/filter changes
    } else {
      setLoadingQueuePagination(true); // Only disable pagination buttons for page changes
    }

    try {
      const now = new Date();
      const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000).toISOString();

      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' })
        .eq('status_tagihan', 'Menunggu Verifikasi')
        .is('nomor_verifikasi', null) // NEW: Only show if nomor_verifikasi is NULL
        .order('waktu_registrasi', { ascending: true });

      query = query.or(
        `locked_by.is.null,locked_by.eq.${user?.id},locked_at.lt.${lockTimeoutThreshold}`
      );

      if (debouncedQueueSearchQuery) {
        query = query.or(
          `nomor_spm.ilike.%${debouncedQueueSearchQuery}%,nama_skpd.ilike.%${debouncedQueueSearchQuery}%`
        );
      }

      // NEW: Apply SKPD filter for queue
      if (selectedSkpdAntrian !== 'Semua SKPD') {
        query = query.eq('nama_skpd', selectedSkpdAntrian);
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
      if (!isPaginationOnlyChange) {
        setLoadingQueue(false);
      } else {
        setLoadingQueuePagination(false);
      }
    }
  };

  const fetchHistoryTagihan = async (isPaginationOnlyChange = false) => {
    if (sessionLoading || !user || !profile?.peran) {
      setLoadingHistory(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingHistory(true);
    } else {
      setLoadingHistoryPagination(true);
    }

    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      const now = new Date().toISOString(); // Current time for tenggat_perbaikan check

      if (profile.peran === 'Staf Verifikator') {
        setHistoryPanelTitle('Riwayat Verifikasi Hari Ini & Ditahan');
        
        // Query for Condition A: Status 'Diteruskan' HARI INI
        let queryA = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .eq('nama_verifikator', profile.nama_lengkap)
          .is('id_korektor', null)
          .eq('status_tagihan', 'Diteruskan')
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);

        // Apply history search query to queryA
        if (debouncedHistorySearchQuery) {
          queryA = queryA.or(
            `nomor_spm.ilike.%${debouncedHistorySearchQuery}%,nama_skpd.ilike.%${debouncedHistorySearchQuery}%`
          );
        }

        // Apply history SKPD filter to queryA
        if (selectedHistorySkpd !== 'Semua SKPD') {
          queryA = queryA.eq('nama_skpd', selectedHistorySkpd);
        }

        // Query for Condition B: Status 'Dikembalikan' DAN tenggat belum lewat
        let queryB = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .eq('nama_verifikator', profile.nama_lengkap)
          .is('id_korektor', null)
          .eq('status_tagihan', 'Dikembalikan')
          .gte('tenggat_perbaikan', now); // tenggat_perbaikan masih di masa depan

        // Apply history search query to queryB
        if (debouncedHistorySearchQuery) {
          queryB = queryB.or(
            `nomor_spm.ilike.%${debouncedHistorySearchQuery}%,nama_skpd.ilike.%${debouncedHistorySearchQuery}%`
          );
        }

        // Apply history SKPD filter to queryB
        if (selectedHistorySkpd !== 'Semua SKPD') {
          queryB = queryB.eq('nama_skpd', selectedHistorySkpd);
        }

        // Query for Condition C: Status 'Menunggu Verifikasi' DAN nomor_verifikasi TIDAK KOSONG
        let queryC = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .eq('nama_verifikator', profile.nama_lengkap)
          .is('id_korektor', null)
          .eq('status_tagihan', 'Menunggu Verifikasi')
          .not('nomor_verifikasi', 'is', null);

        // Apply history search query to queryC
        if (debouncedHistorySearchQuery) {
          queryC = queryC.or(
            `nomor_spm.ilike.%${debouncedHistorySearchQuery}%,nama_skpd.ilike.%${debouncedHistorySearchQuery}%`
          );
        }

        // Apply history SKPD filter to queryC
        if (selectedHistorySkpd !== 'Semua SKPD') {
          queryC = queryC.eq('nama_skpd', selectedHistorySkpd);
        }

        const { data: dataA, error: errorA, count: countA } = await queryA;
        const { data: dataB, error: errorB, count: countB } = await queryB;
        const { data: dataC, error: errorC, count: countC } = await queryC; // Execute queryC

        if (errorA) throw errorA;
        if (errorB) throw errorB;
        if (errorC) throw errorC; // Handle error for queryC

        const combinedData = [...(dataA || []), ...(dataB || []), ...(dataC || [])]; // Combine all three datasets
        // Sort combined data by waktu_verifikasi descending
        combinedData.sort((a, b) => {
          const dateA = parseISO(a.waktu_verifikasi || '1970-01-01T00:00:00Z');
          const dateB = parseISO(b.waktu_verifikasi || '1970-01-01T00:00:00Z');
          return dateB.getTime() - dateA.getTime();
        });

        setHistoryTagihanList(combinedData as Tagihan[]);
        setHistoryTotalItems((countA || 0) + (countB || 0) + (countC || 0)); // Sum all counts for total items

      } else if (profile.peran === 'Staf Koreksi') {
        setHistoryPanelTitle('Pengembalian Terakhir Anda');
        let query = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .eq('status_tagihan', 'Dikembalikan')
          .eq('id_korektor', user.id)
          .gte('waktu_koreksi', todayStart)
          .lte('waktu_koreksi', todayEnd);
        query = query.order('waktu_koreksi', { ascending: false });

        // Apply history search query
        if (debouncedHistorySearchQuery) {
          query = query.or(
            `nomor_spm.ilike.%${debouncedHistorySearchQuery}%,nama_skpd.ilike.%${debouncedHistorySearchQuery}%`
          );
        }

        // NEW: Apply history SKPD filter
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

      } else {
        // Fallback for other roles, or if no specific filter is needed
        setHistoryPanelTitle('Riwayat Verifikasi Hari Ini');
        let query = supabase
          .from('database_tagihan')
          .select('*', { count: 'exact' })
          .in('status_tagihan', ['Diteruskan', 'Dikembalikan'])
          .gte('waktu_verifikasi', todayStart)
          .lte('waktu_verifikasi', todayEnd);
        query = query.order('waktu_verifikasi', { ascending: false });

        // Apply history search query
        if (debouncedHistorySearchQuery) {
          query = query.or(
            `nomor_spm.ilike.%${debouncedHistorySearchQuery}%,nama_skpd.ilike.%${debouncedHistorySearchQuery}%`
          );
        }

        // NEW: Apply history SKPD filter
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
      }

    } catch (error: any) {
      console.error('Error fetching history tagihan:', error.message);
      toast.error('Gagal memuat riwayat verifikasi: ' + error.message);
    } finally {
      if (!isPaginationOnlyChange) {
        setLoadingHistory(false);
      } else {
        setLoadingHistoryPagination(false);
      }
    }
  };

  // Fungsi baru untuk menangani keberhasilan verifikasi atau koreksi
  const handleActionSuccess = () => {
    fetchQueueTagihan(); // Perbarui daftar antrian
    fetchHistoryTagihan(); // Perbarui daftar riwayat
  };

  useEffect(() => {
    let isPaginationOnlyChange = false;
    if (
      prevQueueCurrentPageRef.current !== queueCurrentPage &&
      prevQueueSearchQueryRef.current === debouncedQueueSearchQuery &&
      prevSelectedSkpdAntrianRef.current === selectedSkpdAntrian && // MODIFIED: Use new ref
      prevQueueItemsPerPageRef.current === queueItemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchQueueTagihan(isPaginationOnlyChange);

    prevQueueSearchQueryRef.current = debouncedQueueSearchQuery;
    prevSelectedSkpdAntrianRef.current = selectedSkpdAntrian; // MODIFIED: Update new ref
    prevQueueItemsPerPageRef.current = queueItemsPerPage;
    prevQueueCurrentPageRef.current = queueCurrentPage;

  }, [user, sessionLoading, profile, debouncedQueueSearchQuery, selectedSkpdAntrian, queueCurrentPage, queueItemsPerPage]); // MODIFIED: Add selectedSkpdAntrian to dependencies

  useEffect(() => {
    let isPaginationOnlyChange = false;
    if (
      prevHistoryCurrentPageRef.current !== historyCurrentPage &&
      prevHistorySearchQueryRef.current === debouncedHistorySearchQuery &&
      prevSelectedHistorySkpdRef.current === selectedHistorySkpd &&
      prevHistoryItemsPerPageRef.current === historyItemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchHistoryTagihan(isPaginationOnlyChange);

    prevHistorySearchQueryRef.current = debouncedHistorySearchQuery;
    prevSelectedHistorySkpdRef.current = selectedHistorySkpd;
    prevHistoryItemsPerPageRef.current = historyItemsPerPage;
    prevHistoryCurrentPageRef.current = historyCurrentPage;
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
          // console.log('Realtime UPDATE received:', newTagihan); // Debug log

          const now = new Date();
          const lockTimeoutThreshold = new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000);

          setQueueTagihanList(prevList => {
            const existingIndex = prevList.findIndex(t => t.id_tagihan === newTagihan.id_tagihan);
            let updatedList = [...prevList];

            // MODIFIED: Add check for nomor_verifikasi === null
            const isCurrentlyInQueue =
              newTagihan.status_tagihan === 'Menunggu Verifikasi' &&
              newTagihan.nomor_verifikasi === null && // Only if not yet verified
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
                if (newTagihan.status_tagihan !== 'Menunggu Verifikasi' || newTagihan.nomor_verifikasi !== null) {
                  toast.info(`Tagihan ${newTagihan.nomor_spm} telah diverifikasi.`);
                } else if (newTagihan.locked_by !== null && newTagihan.locked_by !== user?.id) {
                  toast.info(`Tagihan ${newTagihan.nomor_spm} sedang diproses oleh verifikator lain.`);
                }
              }
            }
            return updatedList.sort((a, b) => (a.waktu_registrasi || '').localeCompare(b.waktu_registrasi || ''));
          });

          setHistoryTagihanList(prevList => {
            const now = new Date();
            const todayStart = startOfDay(now).toISOString();
            const todayEnd = endOfDay(now).toISOString();

            const isConditionA = newTagihan.status_tagihan === 'Diteruskan' &&
                                 newTagihan.nama_verifikator === profile?.nama_lengkap &&
                                 newTagihan.id_korektor === null &&
                                 newTagihan.waktu_verifikasi &&
                                 parseISO(newTagihan.waktu_verifikasi).toISOString() >= todayStart &&
                                 parseISO(newTagihan.waktu_verifikasi).toISOString() <= todayEnd;

            const isConditionB = newTagihan.status_tagihan === 'Dikembalikan' &&
                                 newTagihan.nama_verifikator === profile?.nama_lengkap &&
                                 newTagihan.id_korektor === null &&
                                 newTagihan.tenggat_perbaikan &&
                                 parseISO(newTagihan.tenggat_perbaikan).getTime() >= now.getTime();

            const isConditionC = newTagihan.status_tagihan === 'Menunggu Verifikasi' &&
                                 newTagihan.nama_verifikator === profile?.nama_lengkap &&
                                 newTagihan.id_korektor === null &&
                                 newTagihan.nomor_verifikasi !== null;

            const shouldBeInHistoryForVerifier = profile?.peran === 'Staf Verifikator' && (isConditionA || isConditionB || isConditionC);
            
            const shouldBeInHistoryForKoreksi = newTagihan.waktu_koreksi &&
                                                isSameDay(parseISO(newTagihan.waktu_koreksi), new Date()) &&
                                                newTagihan.status_tagihan === 'Dikembalikan' &&
                                                newTagihan.id_korektor === user?.id;

            const existingHistoryIndex = prevList.findIndex(t => t.id_tagihan === newTagihan.id_tagihan);
            let updatedHistoryList = [...prevList];

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
            return updatedHistoryList.sort((a, b) => {
              const dateA = parseISO(a.waktu_verifikasi || a.waktu_koreksi || '1970-01-01T00:00:00Z');
              const dateB = parseISO(b.waktu_verifikasi || b.waktu_koreksi || '1970-01-01T00:00:00Z');
              return dateB.getTime() - dateA.getTime();
            });
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

  // NEW: handleEditVerificationClick for 'Dikembalikan' status
  const handleEditVerificationClick = (tagihan: Tagihan) => {
    setSelectedTagihanForVerifikasi(tagihan);
    setIsVerifikasiModalOpen(true);
  };

  const queueTotalPages = queueItemsPerPage === -1 ? 1 : Math.ceil(queueTotalItems / queueItemsPerPage);
  const historyTotalPages = historyItemsPerPage === -1 ? 1 : Math.ceil(historyTotalItems / historyItemsPerPage);

  // Renderer for Countdown component
  const renderer = ({ days, hours, minutes, seconds, completed }: any) => {
    if (completed) {
      // Render a completed state
      return <span className="text-xs text-red-500">Waktu Habis!</span>;
    } else {
      // Render a countdown
      return (
        <span className="text-xs text-muted-foreground mt-1">
          Sisa waktu: {days > 0 && `${days} hari `}{hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      );
    }
  };

  // NEW: useEffect to handle URL parameter for opening modal
  useEffect(() => {
    const tagihanToOpenId = searchParams.get('open_verifikasi');
    // Only proceed if tagihanToOpenId exists, user is logged in, and is a Staf Verifikator
    if (tagihanToOpenId && user && profile?.peran === 'Staf Verifikator' && historyTagihanList.length > 0) {
      const tagihan = historyTagihanList.find(t => t.id_tagihan === tagihanToOpenId);

      if (tagihan) {
        // If tagihan is found, open the verification modal
        handleEditVerificationClick(tagihan); // Use handleEditVerificationClick to open the modal
      } else {
        toast.info('Tagihan tidak ditemukan di riwayat verifikasi Anda.');
      }
      // Clear the URL parameter to prevent re-opening on refresh
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user, profile, historyTagihanList, setSearchParams]); // Depend on historyTagihanList

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
              {/* MODIFIED: Replaced Select with Combobox */}
              <Combobox
                options={skpdOptionsAntrian}
                value={selectedSkpdAntrian}
                onValueChange={(value) => {
                  setSelectedSkpdAntrian(value);
                  setQueueCurrentPage(1); // Reset page on SKPD change
                }}
                placeholder="Filter SKPD"
                className="w-full sm:w-[180px]"
              />
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

          {loadingQueue && !loadingQueuePagination ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Memuat antrian...</p>
          ) : queueTagihanList.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan di antrian verifikasi.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table><TableHeader><TableRow>
                      <TableHead className="w-[50px]">No.</TableHead><TableHead>Nomor Registrasi</TableHead><TableHead>Waktu Registrasi</TableHead><TableHead>Nomor SPM</TableHead><TableHead>Nama SKPD</TableHead><TableHead>Jumlah Kotor</TableHead><TableHead className="text-center">Aksi</TableHead>
                    </TableRow></TableHeader><TableBody>
                    {queueTagihanList.map((tagihan, index) => {
                      const isLockedByOther = tagihan.locked_by && tagihan.locked_by !== user?.id;
                      const isStaleLock = tagihan.locked_at && (new Date().getTime() - parseISO(tagihan.locked_at).getTime()) > LOCK_TIMEOUT_MINUTES * 60 * 1000;

                      const isDisabled = isLockedByOther && !isStaleLock;

                      return (
                        <TableRow key={tagihan.id_tagihan}>
                          <TableCell>{(queueCurrentPage - 1) * queueItemsPerPage + index + 1}</TableCell><TableCell className="font-medium">{tagihan.nomor_registrasi || '-'}</TableCell><TableCell>
                            {tagihan.waktu_registrasi ? format(parseISO(tagihan.waktu_registrasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'}
                          </TableCell><TableCell>{tagihan.nomor_spm}</TableCell><TableCell>{tagihan.nama_skpd}</TableCell><TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell><TableCell className="text-center">
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
                  </TableBody></Table>
              </div>
              {/* Pagination Controls */}
              <div className="mt-6 flex items-center justify-end space-x-4">
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
              {/* MODIFIED: Replaced Select with Combobox */}
              <Combobox
                options={skpdOptionsHistory}
                value={selectedHistorySkpd}
                onValueChange={(value) => {
                  setSelectedHistorySkpd(value);
                  setHistoryCurrentPage(1); // Reset page on SKPD change
                }}
                placeholder="Filter SKPD"
                className="w-full sm:w-[180px]"
              />
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

          {loadingHistory && !loadingHistoryPagination ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Memuat riwayat verifikasi...</p>
          ) : historyTagihanList.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada riwayat verifikasi hari ini.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table><TableHeader><TableRow>
                      <TableHead className="w-[50px]">No.</TableHead><TableHead>{profile?.peran === 'Staf Koreksi' ? 'Waktu Koreksi' : 'Waktu Verifikasi'}</TableHead><TableHead>{profile?.peran === 'Staf Koreksi' ? 'Nomor Koreksi' : 'Nomor Verifikasi'}</TableHead><TableHead>Nama SKPD</TableHead><TableHead>Nomor SPM</TableHead><TableHead>Status Tagihan</TableHead><TableHead className="text-center">Aksi</TableHead>
                    </TableRow></TableHeader><TableBody>
                    {historyTagihanList.map((tagihan, index) => (
                      <TableRow key={tagihan.id_tagihan}>
                        <TableCell>{(historyCurrentPage - 1) * historyItemsPerPage + index + 1}</TableCell><TableCell>
                          {profile?.peran === 'Staf Koreksi'
                            ? (tagihan.waktu_koreksi ? format(parseISO(tagihan.waktu_koreksi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-')
                            : (tagihan.waktu_verifikasi ? format(parseISO(tagihan.waktu_verifikasi), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-')}
                        </TableCell><TableCell className="font-medium">
                          {profile?.peran === 'Staf Koreksi' ? (tagihan.nomor_koreksi || '-') : (tagihan.nomor_verifikasi || '-')}
                        </TableCell><TableCell>{tagihan.nama_skpd}</TableCell><TableCell>{tagihan.nomor_spm}</TableCell><TableCell>
                          <StatusBadge status={tagihan.status_tagihan} />
                          {tagihan.status_tagihan === 'Dikembalikan' && tagihan.tenggat_perbaikan && (
                            <Countdown date={new Date(tagihan.tenggat_perbaikan)} renderer={renderer} />
                          )}
                        </TableCell><TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="outline" size="icon" title="Lihat Detail" onClick={() => handleDetailClick(tagihan)}>
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" title="Cetak" onClick={() => handlePrintClick(tagihan.id_tagihan)}>
                              <PrinterIcon className="h-4 w-4" />
                            </Button>
                            {tagihan.status_tagihan === 'Dikembalikan' && (
                              <Button variant="outline" size="icon" title="Edit (Verifikasi Ulang)" onClick={() => handleEditVerificationClick(tagihan)}>
                                <FilePenLine className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-4">
                <div className="text-sm text-muted-foreground">
                  Halaman {historyTotalItems === 0 ? 0 : historyCurrentPage} dari {historyTotalPages} ({historyTotalItems} total item)
                </div>
                <Button
                  variant="outline"
                  onClick={() => setHistoryCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={historyCurrentPage === 1 || historyItemsPerPage === -1 || loadingHistoryPagination}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setHistoryCurrentPage((prev) => Math.min(historyTotalPages, prev + 1))}
                  disabled={historyCurrentPage === historyTotalPages || historyItemsPerPage === -1 || loadingHistoryPagination}
                >
                  Berikutnya
                </Button>
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