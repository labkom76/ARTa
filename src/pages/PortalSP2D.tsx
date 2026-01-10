import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    SearchIcon,
    Landmark,
    EyeIcon,
    Clock,
    TrendingUp,
    CheckCircle,
    RefreshCw,
    HistoryIcon,
    CalendarIcon,
    FileDownIcon,
    CheckCircle2,
    CreditCard,
    PlusCircle,
    ListIcon,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { format, parseISO, startOfDay, getMonth, getYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import StatusBadge from '@/components/StatusBadge';
import RegisterSP2DDialog from '@/components/RegisterSP2DDialog';
import SP2DDetailDialog from '@/components/SP2DDetailDialog';
import { BankBadge } from '@/components/BankBadge';
import AntrianSP2DDialog from '@/components/AntrianSP2DDialog';
import { getJenisTagihanCode } from '@/utils/spmGenerator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Tagihan } from '@/types/tagihan';
import * as XLSX from 'xlsx';

interface SkpdOption {
    value: string;
    label: string;
}

const months = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '0', label: 'Januari' },
    { value: '1', label: 'Februari' },
    { value: '2', label: 'Maret' },
    { value: '3', label: 'April' },
    { value: '4', label: 'Mei' },
    { value: '5', label: 'Juni' },
    { value: '6', label: 'Juli' },
    { value: '7', label: 'Agustus' },
    { value: '8', label: 'September' },
    { value: '9', label: 'Oktober' },
    { value: '10', label: 'November' },
    { value: '11', label: 'Desember' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - 2 + i).toString(),
    label: (currentYear - 2 + i).toString(),
}));


const PortalSP2D = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 700);
    const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
    const [skpdOptions, setSkpdOptions] = useState<SkpdOption[]>([]);

    // Main Panel Period Filters
    const [mainSelectedMonth, setMainSelectedMonth] = useState<string>('all');
    const [mainSelectedYear, setMainSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Dialog States
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [selectedHistoryForDetail, setSelectedHistoryForDetail] = useState<Tagihan | null>(null);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [selectedTagihanForRegister, setSelectedTagihanForRegister] = useState<Tagihan | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFromAntrian, setIsFromAntrian] = useState(false);

    // Delete Confirmation State
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [tagihanToDelete, setTagihanToDelete] = useState<Tagihan | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // History State
    const [historyList, setHistoryList] = useState<Tagihan[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Main Table Pagination State
    const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
    const [historyPageSize, setHistoryPageSize] = useState(10);

    // Antrian Dialog State (only visibility control)
    const [isAntrianDialogOpen, setIsAntrianDialogOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{
        column: keyof Tagihan | 'nomor_urut_sp2d' | 'tanggal_bsg' | 'nama_bank';
        direction: 'asc' | 'desc';
    }>({ column: 'nomor_urut_sp2d', direction: 'asc' });

    const handleSort = (column: keyof Tagihan | 'nomor_urut_sp2d' | 'tanggal_bsg' | 'nama_bank') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.column === column && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ column, direction });
    };

    const sortedHistoryList = [...historyList].sort((a, b) => {
        const { column, direction } = sortConfig;

        let valA = a[column as keyof Tagihan];
        let valB = b[column as keyof Tagihan];

        // Khusus untuk No. Reg (nomor_urut_sp2d)
        if (column === 'nomor_urut_sp2d') {
            valA = a.nomor_urut_sp2d || 0;
            valB = b.nomor_urut_sp2d || 0;
        }

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? valA - valB : valB - valA;
        }

        return 0;
    });

    useEffect(() => {
        fetchSkpdOptions();
    }, []);

    useEffect(() => {
        if (user && (profile?.peran === 'Register SP2D' || profile?.peran === 'Administrator')) {
            // Main table (History) uses main panel filters
            fetchHistory();
        }
    }, [user, profile, debouncedSearchQuery, selectedSkpd, mainSelectedMonth, mainSelectedYear]);

    const fetchSkpdOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('master_skpd')
                .select('nama_skpd')
                .order('nama_skpd', { ascending: true });

            if (error) throw error;
            const uniqueSkpd = Array.from(new Set(data.filter(item => item.nama_skpd).map(item => item.nama_skpd)))
                .map(skpd => ({ value: skpd!, label: skpd! }));
            setSkpdOptions([{ value: 'Semua SKPD', label: 'Semua SKPD' }, ...uniqueSkpd]);
        } catch (error: any) {
            console.error('Error fetching SKPD:', error.message);
        }
    };


    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            let startDateStr: string;
            let endDateStr: string;

            if (mainSelectedMonth !== 'all') {
                startDateStr = format(new Date(parseInt(mainSelectedYear), parseInt(mainSelectedMonth), 1), 'yyyy-MM-dd');
                endDateStr = format(new Date(parseInt(mainSelectedYear), parseInt(mainSelectedMonth) + 1, 0), 'yyyy-MM-dd');
            } else {
                // Show all months in the selected year
                startDateStr = format(new Date(parseInt(mainSelectedYear), 0, 1), 'yyyy-MM-dd');
                endDateStr = format(new Date(parseInt(mainSelectedYear), 11, 31), 'yyyy-MM-dd');
            }

            let query = supabase
                .from('database_tagihan')
                .select('*')
                .eq('status_tagihan', 'Selesai')
                .gte('tanggal_sp2d', startDateStr)
                .lte('tanggal_sp2d', endDateStr);

            if (debouncedSearchQuery) {
                query = query.ilike('nomor_spm', `%${debouncedSearchQuery}%`);
            }
            if (selectedSkpd !== 'Semua SKPD') {
                query = query.eq('nama_skpd', selectedSkpd);
            }

            const { data, error } = await query.order('nomor_urut_sp2d', { ascending: true });

            if (error) throw error;
            setHistoryList(data as Tagihan[]);
        } catch (error: any) {
            console.error('Error fetching history:', error.message);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleRegisterClick = (tagihan: Tagihan) => {
        setSelectedTagihanForRegister(tagihan);
        setIsFromAntrian(true);
        setIsRegisterOpen(true);
        setIsAntrianDialogOpen(false); // Close the list when registering
    };

    const handleConfirmRegister = async (data: {
        tanggal_sp2d: string;
        nama_bank: string;
        tanggal_bsg: string;
        catatan_sp2d: string;
    }) => {
        if (!selectedTagihanForRegister) return;
        setIsSubmitting(true);
        try {
            // 1. Ambil nomor urut terakhir
            const { data: lastData, error: lastError } = await supabase
                .from('database_tagihan')
                .select('nomor_urut_sp2d')
                .not('nomor_urut_sp2d', 'is', null)
                .order('nomor_urut_sp2d', { ascending: false })
                .limit(1);

            if (lastError) throw lastError;

            const nextNomorUrut = (lastData && lastData.length > 0)
                ? (lastData[0].nomor_urut_sp2d + 1)
                : 1;

            // 2. Simpan registrasi dengan nomor urut permanen
            const { error } = await supabase
                .from('database_tagihan')
                .update({
                    ...data,
                    status_tagihan: 'Selesai',
                    nomor_urut_sp2d: nextNomorUrut,
                    waktu_registrasi_sp2d: new Date().toISOString()
                })
                .eq('id_tagihan', selectedTagihanForRegister.id_tagihan);

            if (error) throw error;

            toast.success('Registrasi SP2D berhasil disimpan!');
            setIsRegisterOpen(false);
            fetchHistory();
            // Reopen antrian dialog only if we came from there
            if (isFromAntrian) {
                setIsAntrianDialogOpen(true);
            }
        } catch (error: any) {
            toast.error('Gagal menyimpan registrasi: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (tagihan: Tagihan) => {
        setSelectedTagihanForRegister(tagihan);
        setIsFromAntrian(false);
        setIsRegisterOpen(true);
    };

    const handleDeleteClick = (tagihan: Tagihan) => {
        setTagihanToDelete(tagihan);
        setIsDeleteDialogOpen(true);
    };

    const handleExportExcel = () => {
        if (historyList.length === 0) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        try {
            // Prepare data for export - Map to user-friendly format based on screenshot
            const exportData = historyList.map((h, index) => {
                const spmParts = h.nomor_spm.split('/');
                const noSp2d = spmParts[2]?.padStart(6, '0') || '-';
                // Reconstruct Kode SP2D: skip SKPD (index 4) and join Jadwal, Month, Year
                // Also format month (index 6 in full SPM, index 1 in sliced) to remove leading zero
                const kodeParts = spmParts.slice(5);
                if (kodeParts.length >= 2) {
                    kodeParts[1] = parseInt(kodeParts[1]).toString();
                }
                const kodeSp2d = kodeParts.length > 0 ? `/${kodeParts.join('/')}` : '-';

                return {
                    'No. Reg.': h.nomor_urut_sp2d || '-',
                    'TGL. SP2D': h.tanggal_sp2d ? format(parseISO(h.tanggal_sp2d), 'dd/MM/yyyy') : '-',
                    'NO. SP2D': noSp2d,
                    'JENIS': getJenisTagihanCode(h.jenis_tagihan),
                    'S K P D': h.nama_skpd,
                    'URAIAN': h.uraian,
                    'JUMLAH': h.jumlah_kotor, // Will be formatted below
                    'NAMA BANK': h.nama_bank || '-',
                    'TANGGAL DISERAHKAN KE BSG': h.tanggal_bsg ? format(parseISO(h.tanggal_bsg), 'dd/MM/yyyy') : '-',
                    'KODE SP2D': kodeSp2d,
                    'CATATAN KOREKSI': h.catatan_sp2d || '-'
                };
            });

            // Create Worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Format JUMLAH column to have dots as thousands separator (as string for consistency in basic XLSX)
            // Note: XLSX.utils.json_to_sheet detects numbers. To match screenshot styling (e.g. 202.256.588),
            // we can apply a number format to the cells.
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: 6 }); // Column G (JUMLAH)
                if (ws[cellAddress]) {
                    ws[cellAddress].z = '#,##0'; // Indonesian default separator in Excel usually follows system, but #,##0 is standard
                }
            }

            // Set column widths
            const wscols = [
                { wch: 8 },  // No. Reg.
                { wch: 15 }, // TGL. SP2D
                { wch: 12 }, // NO. SP2D
                { wch: 8 },  // JENIS
                { wch: 40 }, // S K P D
                { wch: 60 }, // URAIAN
                { wch: 18 }, // JUMLAH
                { wch: 15 }, // NAMA BANK
                { wch: 25 }, // TANGGAL BSG
                { wch: 15 }, // KODE SP2D
                { wch: 30 }  // CATATAN KOREKSI
            ];
            ws['!cols'] = wscols;

            // Create Workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Register SP2D");

            // Generate filename based on filters
            const monthLabel = mainSelectedMonth === 'all' ? 'Semua_Bulan' : months.find(m => m.value === mainSelectedMonth)?.label;
            const filename = `Register_SP2D_${monthLabel}_${mainSelectedYear}.xlsx`;

            // Trigger Download
            XLSX.writeFile(wb, filename);
            toast.success('Data berhasil diekspor ke Excel!');
        } catch (error: any) {
            console.error('Export Error:', error);
            toast.error('Gagal mengekspor data: ' + error.message);
        }
    };

    const confirmDelete = async () => {
        if (!tagihanToDelete) return;

        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('database_tagihan')
                .update({
                    status_tagihan: 'Diteruskan',
                    tanggal_sp2d: null,
                    nama_bank: null,
                    tanggal_bsg: null,
                    catatan_sp2d: null,
                })
                .eq('id_tagihan', tagihanToDelete.id_tagihan);

            if (error) throw error;

            toast.success('Registrasi SP2D berhasil dihapus dan dikembalikan ke antrian!');
            setIsDeleteDialogOpen(false);
            setTagihanToDelete(null);
            fetchHistory();
        } catch (error: any) {
            toast.error('Gagal menghapus registrasi: ' + error.message);
        } finally {
            setIsDeleting(false);
        }
    };



    if (sessionLoading) return null;

    if (profile?.peran !== 'Register SP2D' && profile?.peran !== 'Administrator') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <CreditCard className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Register SP2D
                        </h1>
                        <p className="text-sm text-slate-600 mt-0.5 font-medium">
                            Manajemen dan riwayat penerbitan SP2D sistem
                        </p>
                    </div>
                </div>
                <div className="h-10" /> {/* Placeholder spacing */}
            </div>

            {/* Filter Section */}
            <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                placeholder="Cari berdasarkan Nomor SPM..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-12 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="w-full sm:w-48">
                                <Combobox
                                    options={months}
                                    value={mainSelectedMonth}
                                    onValueChange={setMainSelectedMonth}
                                    placeholder="Filter Bulan"
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                            <div className="w-full sm:w-32">
                                <Combobox
                                    options={years}
                                    value={mainSelectedYear}
                                    onValueChange={setMainSelectedYear}
                                    placeholder="Filter Tahun"
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                            <div className="w-full sm:w-64">
                                <Combobox
                                    options={skpdOptions}
                                    value={selectedSkpd}
                                    onValueChange={setSelectedSkpd}
                                    placeholder="Filter Nama SKPD"
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Table (History/Register SP2D) */}
            <div className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <HistoryIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    Daftar Register SP2D
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Riwayat penerbitan dan registrasi SP2D
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto whitespace-nowrap">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => { fetchHistory(); }}
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all rounded-lg"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Refresh Data</p>
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={handleExportExcel}
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all rounded-lg"
                                            disabled={loadingHistory || historyList.length === 0}
                                        >
                                            <FileDownIcon className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Ekspor ke Excel</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                            <Button
                                onClick={() => setIsAntrianDialogOpen(true)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 rounded-lg transition-all hover:scale-105 gap-2 text-sm"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Regis SP2D
                            </Button>
                        </div>
                    </div>

                    <CardContent className="pt-6">
                        <Table containerClassName="max-h-[650px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                            <TableHeader className="bg-emerald-50 dark:bg-slate-900 shadow-sm transition-colors">
                                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('nomor_urut_sp2d')}
                                    >
                                        <div className="flex items-center gap-1">
                                            No. Reg
                                            {sortConfig.column === 'nomor_urut_sp2d' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('tanggal_sp2d')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Tgl. SP2D
                                            {sortConfig.column === 'tanggal_sp2d' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('nomor_spm')}
                                    >
                                        <div className="flex items-center gap-1">
                                            No. SP2D
                                            {sortConfig.column === 'nomor_spm' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('nama_skpd')}
                                    >
                                        <div className="flex items-center gap-1">
                                            SKPD
                                            {sortConfig.column === 'nama_skpd' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    {/* Kolom Uraian dihapus untuk melegakan ruang */}
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 text-right cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('jumlah_kotor')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Jumlah
                                            {sortConfig.column === 'jumlah_kotor' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('tanggal_bsg')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Tgl. Serah
                                            {sortConfig.column === 'tanggal_bsg' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    <TableHead
                                        className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 cursor-pointer hover:bg-emerald-100/50 dark:hover:bg-emerald-900/50 transition-colors"
                                        onClick={() => handleSort('nama_bank')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Bank
                                            {sortConfig.column === 'nama_bank' ? (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                            ) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingHistory ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="relative w-12 h-12">
                                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Memuat data registrasi...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : historyList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <CreditCard className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Belum ada registrasi SP2D pada periode ini.</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Coba ubah filter pencarian</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedHistoryList.slice((historyCurrentPage - 1) * historyPageSize, historyCurrentPage * historyPageSize).map((h, index) => (
                                        <TableRow key={h.id_tagihan} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <TableCell className="text-slate-700 dark:text-slate-300">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    {h.nomor_urut_sp2d || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-700 dark:text-slate-300">
                                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {h.tanggal_sp2d ? format(parseISO(h.tanggal_sp2d), 'dd/MM/yyyy') : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                                {h.nomor_spm.split('/')[2]?.padStart(6, '0') || '-'}
                                            </TableCell>
                                            <TableCell className="min-w-[200px]">
                                                <div className="font-bold text-slate-900 dark:text-white leading-snug" title={h.nama_skpd}>
                                                    {h.nama_skpd}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    Rp{h.jumlah_kotor.toLocaleString('id-ID')}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                                    {h.tanggal_bsg ? format(parseISO(h.tanggal_bsg), 'dd/MM/yyyy') : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <BankBadge bankName={h.nama_bank} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                                                    onClick={() => { setSelectedHistoryForDetail(h); setIsDetailDialogOpen(true); }}
                                                                >
                                                                    <EyeIcon className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Lihat Detail</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                                                                    onClick={() => handleEditClick(h)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Registrasi</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors"
                                                                    onClick={() => handleDeleteClick(h)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Hapus & Kembalikan ke Antrian</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {historyList.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                        <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">Baris :</label>
                                        <Select
                                            value={historyPageSize.toString()}
                                            onValueChange={(value) => {
                                                const newSize = value === 'all' ? historyList.length : parseInt(value);
                                                setHistoryPageSize(newSize);
                                                setHistoryCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="w-[70px] h-8 text-xs bg-transparent border-none focus:ring-0 font-bold text-emerald-700 dark:text-emerald-400 p-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                                <SelectItem value="100">100</SelectItem>
                                                <SelectItem value="500">500</SelectItem>
                                                <SelectItem value="all">Semua</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap text-center sm:text-left">
                                        Menampilkan {Math.min((historyCurrentPage - 1) * historyPageSize + 1, historyList.length)} - {Math.min(historyCurrentPage * historyPageSize, historyList.length)} dari {historyList.length} data
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={historyCurrentPage === 1}
                                        onClick={() => setHistoryCurrentPage(p => p - 1)}
                                        className="hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Sebelumnya
                                    </Button>
                                    <div className="px-4 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {historyCurrentPage} / {Math.ceil(historyList.length / historyPageSize)}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={historyCurrentPage >= Math.ceil(historyList.length / historyPageSize)}
                                        onClick={() => setHistoryCurrentPage(p => p + 1)}
                                        className="hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        Berikutnya
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Antrian Dialog Component */}
            <AntrianSP2DDialog
                isOpen={isAntrianDialogOpen}
                onClose={() => setIsAntrianDialogOpen(false)}
                onRegisterClick={handleRegisterClick}
                skpdOptions={skpdOptions}
            />

            {/* Dialogs */}
            <RegisterSP2DDialog
                isOpen={isRegisterOpen}
                onClose={() => {
                    setIsRegisterOpen(false);
                    if (isFromAntrian) {
                        setIsAntrianDialogOpen(true); // Reopen antrian when user cancels only if from antrian
                    }
                }}
                onConfirm={handleConfirmRegister}
                tagihan={selectedTagihanForRegister}
                isSubmitting={isSubmitting}
            />

            <SP2DDetailDialog
                isOpen={isDetailDialogOpen}
                onClose={() => setIsDetailDialogOpen(false)}
                tagihan={selectedHistoryForDetail}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            Konfirmasi Hapus
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mt-2">
                            Apakah Anda yakin ingin menghapus registrasi SP2D ini?
                            <br />
                            <span className="font-bold text-slate-900 dark:text-slate-200">Data akan dikembalikan ke daftar antrian.</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel
                            disabled={isDeleting}
                            className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-6"
                        >
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            disabled={isDeleting}
                            className="rounded-xl bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white border-none font-bold px-8 shadow-lg shadow-red-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Menghapus...
                                </>
                            ) : (
                                "Ya, Hapus Registrasi"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PortalSP2D;
