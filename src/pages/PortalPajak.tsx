import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    SearchIcon,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    WalletIcon,
    ReceiptIcon,
    CalculatorIcon,
    Eye,
    Edit,
    Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import { Tagihan } from '@/types/tagihan';
import InputPajakDialog from '@/components/InputPajakDialog';
import PajakDetailDialog from '@/components/PajakDetailDialog';
import AntrianPajakDialog from '@/components/AntrianPajakDialog';
import { Combobox } from '@/components/ui/combobox';

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

const PortalPajak = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 700);

    // Period Filters
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [statusPajakFilter, setStatusPajakFilter] = useState<string>('Belum Input');

    // Data State
    const [historyList, setHistoryList] = useState<Tagihan[]>([]);
    const [pajakData, setPajakData] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);
    const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null);
    const [isInputDialogOpen, setIsInputDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [selectedTagihanForView, setSelectedTagihanForView] = useState<Tagihan | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [tagihanToDelete, setTagihanToDelete] = useState<Tagihan | null>(null);
    const [isAntrianDialogOpen, setIsAntrianDialogOpen] = useState(false);
    const [isFromAntrian, setIsFromAntrian] = useState(false);
    const [antrianRefreshKey, setAntrianRefreshKey] = useState(0);
    const [antrianCount, setAntrianCount] = useState(0);
    const [skpdOptions, setSkpdOptions] = useState<{ value: string; label: string }[]>([]);
    const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (user && (profile?.peran === 'Staf Pajak' || profile?.peran === 'Administrator')) {
            fetchData();
            fetchAntrianCount();
            fetchSkpdOptions();
        }
    }, [user, profile, debouncedSearchQuery, selectedMonth, selectedYear, selectedSkpd]);

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

    const fetchAntrianCount = async () => {
        try {
            const { count, error } = await supabase
                .from('database_tagihan')
                .select('*', { count: 'exact', head: true })
                .eq('status_tagihan', 'Selesai')
                .or(`status_pajak.neq.Selesai,status_pajak.is.null`);

            if (error) throw error;
            setAntrianCount(count || 0);
        } catch (error: any) {
            console.error('Error fetching antrian count:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let startDateStr: string;
            let endDateStr: string;

            if (selectedMonth !== 'all') {
                startDateStr = format(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1), 'yyyy-MM-dd');
                endDateStr = format(new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0), 'yyyy-MM-dd');
            } else {
                startDateStr = format(new Date(parseInt(selectedYear), 0, 1), 'yyyy-MM-dd');
                endDateStr = format(new Date(parseInt(selectedYear), 11, 31), 'yyyy-MM-dd');
            }

            let query = supabase
                .from('database_tagihan')
                .select('*')
                .eq('status_tagihan', 'Selesai')
                .eq('status_pajak', 'Selesai')
                .gte('tanggal_sp2d', startDateStr)
                .lte('tanggal_sp2d', endDateStr);

            if (debouncedSearchQuery) {
                query = query.or(`nomor_spm.ilike.%${debouncedSearchQuery}%,nama_skpd.ilike.%${debouncedSearchQuery}%,nomor_sp2d.ilike.%${debouncedSearchQuery}%`);
            }

            if (selectedSkpd !== 'Semua SKPD') {
                query = query.eq('nama_skpd', selectedSkpd);
            }

            const { data, error } = await query.order('tanggal_sp2d', { ascending: false });
            if (error) throw error;
            setHistoryList(data as Tagihan[]);

            // Fetch tax data for all tagihan
            if (data && data.length > 0) {
                const tagihanIds = data.map(t => t.id_tagihan);
                const { data: pajakList, error: pajakError } = await supabase
                    .from('database_pajak')
                    .select('*')
                    .in('id_tagihan', tagihanIds);

                if (pajakError) {
                    console.error('Error fetching pajak data:', pajakError);
                } else if (pajakList) {
                    // Group pajak by id_tagihan
                    const grouped = pajakList.reduce((acc: Record<string, any[]>, pajak) => {
                        if (!acc[pajak.id_tagihan]) {
                            acc[pajak.id_tagihan] = [];
                        }
                        acc[pajak.id_tagihan].push(pajak);
                        return acc;
                    }, {});
                    setPajakData(grouped);
                }
            } else {
                setPajakData({});
            }

            setCurrentPage(1);
        } catch (error: any) {
            console.error('Error fetching data:', error.message);
            toast.error('Gagal memuat riwayat pajak');
        } finally {
            setLoading(false);
        }
    };

    const handleInputPajak = (tagihan: Tagihan, fromAntrian: boolean = false) => {
        setSelectedTagihan(tagihan);
        setIsFromAntrian(fromAntrian);
        setIsInputDialogOpen(true);
        if (!fromAntrian) {
            setIsAntrianDialogOpen(false);
        }
    };

    const handleViewPajak = (tagihan: Tagihan) => {
        setSelectedTagihanForView(tagihan);
        setIsViewDialogOpen(true);
    };

    const handleDeletePajak = (tagihan: Tagihan) => {
        setTagihanToDelete(tagihan);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeletePajak = async () => {
        if (!tagihanToDelete) return;

        try {
            setLoading(true);

            // 1. Delete all tax entries for this tagihan
            const { error: deleteError } = await supabase
                .from('database_pajak')
                .delete()
                .eq('id_tagihan', tagihanToDelete.id_tagihan);

            if (deleteError) throw deleteError;

            // 2. Update status_pajak in database_tagihan back to 'Belum Input'
            const { error: updateError } = await supabase
                .from('database_tagihan')
                .update({ status_pajak: 'Belum Input' })
                .eq('id_tagihan', tagihanToDelete.id_tagihan);

            if (updateError) throw updateError;

            toast.success('Seluruh data pajak berhasil dihapus');
            setIsDeleteDialogOpen(false);
            setTagihanToDelete(null);
            fetchData(); // Refresh list
        } catch (error: any) {
            console.error('Error deleting pajak:', error);
            toast.error('Gagal menghapus data pajak');
        } finally {
            setLoading(false);
        }
    };

    if (sessionLoading) return null;
    if (profile?.peran !== 'Staf Pajak' && profile?.peran !== 'Administrator') {
        return <div className="p-8 text-center text-slate-500">Akses ditolak.</div>;
    }

    const totalPages = Math.ceil(historyList.length / pageSize);
    const paginatedData = historyList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Calculate grand totals of all shown in historyList
    const grandTotalPajak = historyList.reduce((acc, h) => {
        const pajak = pajakData[h.id_tagihan] || [];
        const totalForTagihan = pajak.reduce((sum, p) => sum + (parseFloat(p.jumlah_pajak) || 0), 0);
        return acc + totalForTagihan;
    }, 0);

    const grandTotalBelanja = historyList.reduce((acc, h) => acc + (h.jumlah_kotor || 0), 0);

    return (
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 space-y-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <WalletIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Portal Kerja Pajak
                        </h1>
                        <p className="text-sm text-slate-600 mt-0.5 font-medium">
                            Kelola pemotongan dan penyetoran pajak tagihan SP2D
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <Card className="border-none shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                placeholder="Cari SKPD atau No. SP2D..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 h-10 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="w-full sm:w-48">
                                <Combobox
                                    options={months}
                                    value={selectedMonth}
                                    onValueChange={setSelectedMonth}
                                    placeholder="Filter Bulan"
                                    className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                            <div className="w-full sm:w-32">
                                <Combobox
                                    options={years}
                                    value={selectedYear}
                                    onValueChange={setSelectedYear}
                                    placeholder="Filter Tahun"
                                    className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                            <div className="w-full sm:w-64">
                                <Combobox
                                    options={skpdOptions}
                                    value={selectedSkpd}
                                    onValueChange={setSelectedSkpd}
                                    placeholder="Filter Nama SKPD"
                                    className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Table (Riwayat Pajak) */}
            <div className="space-y-4">
                <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <ReceiptIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        Riwayat Input Pajak
                                    </h2>
                                </div>
                            </div>

                            {/* Summary Badges - Refined & Compact */}
                            <div className="hidden lg:flex items-center gap-2">
                                <div className="flex items-center gap-2 px-3 h-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Total Belanja</span>
                                    <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-800" />
                                    <span className="text-[13px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        Rp{grandTotalBelanja.toLocaleString('id-ID')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 px-3 h-8 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/50 rounded-full">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/60 dark:text-emerald-500/40 whitespace-nowrap">Total Pajak</span>
                                    <div className="w-[1px] h-3 bg-emerald-200 dark:bg-emerald-800" />
                                    <span className="text-[13px] font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                        Rp{grandTotalPajak.toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => { fetchData(); fetchAntrianCount(); }}
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all rounded-lg"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Refresh Data</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                            <Button
                                onClick={() => setIsAntrianDialogOpen(true)}
                                className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold h-9 px-3 rounded-lg transition-all hover:scale-105 gap-2 text-sm"
                            >
                                <CalculatorIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">Input Pajak</span>
                                <span className="sm:hidden">Input</span>
                            </Button>
                        </div>
                    </div>

                    <CardContent className="pt-6">
                        <Table containerClassName="max-h-[850px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                            <TableHeader className="bg-emerald-50 dark:bg-slate-900 shadow-sm transition-colors">
                                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100">
                                        No
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100">
                                        SKPD
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100">
                                        No. SP2D
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 text-right">
                                        Nilai Belanja
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100">
                                        Jenis Pajak
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100">
                                        Kode Akun
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 text-right">
                                        Jumlah Pajak
                                    </TableHead>
                                    <TableHead className="sticky top-0 z-30 bg-emerald-50 dark:bg-slate-900 border-b border-emerald-100 dark:border-emerald-800 font-bold text-emerald-900 dark:text-emerald-100 text-center">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="relative w-12 h-12">
                                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Memuat riwayat pajak...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : historyList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <WalletIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Belum ada riwayat input pajak untuk periode ini.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    historyList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((h, idx) => (
                                        <TableRow key={h.id_tagihan} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors">
                                            <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                                                {(currentPage - 1) * pageSize + idx + 1}
                                            </TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{h.nama_skpd}</div>
                                            </TableCell>
                                            <TableCell className="max-w-[280px]">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate cursor-help">
                                                                {h.nomor_sp2d}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="font-mono text-xs">{h.nomor_sp2d}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                                                Rp{h.jumlah_kotor.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {pajakData[h.id_tagihan]?.map(p => p.jenis_pajak).join(', ') || '-'}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {pajakData[h.id_tagihan]?.map(p => p.kode_akun).join(', ') || '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                {pajakData[h.id_tagihan]
                                                    ? `Rp${pajakData[h.id_tagihan].reduce((sum, p) => sum + (parseFloat(p.jumlah_pajak) || 0), 0).toLocaleString('id-ID')}`
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-1.5">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                                                                    title="Lihat Detail"
                                                                    onClick={() => handleViewPajak(h)}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Lihat Detail Pajak</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                                                                    title="Edit Pajak"
                                                                    onClick={() => handleInputPajak(h)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Data Pajak</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className="h-8 w-8 hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors"
                                                                    title="Hapus Data Pajak"
                                                                    onClick={() => handleDeletePajak(h)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Hapus Data Pajak</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {historyList.length > 0 && (
                                <tfoot className="sticky bottom-0 z-30 bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800">
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={3} className="py-4 text-right">
                                            <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">
                                                Grand Total
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-[15px] font-black text-slate-900 dark:text-white">
                                                Rp{grandTotalBelanja.toLocaleString('id-ID')}
                                            </span>
                                        </TableCell>
                                        <TableCell colSpan={2}></TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-[15px] font-black text-emerald-600 dark:text-emerald-400">
                                                Rp{grandTotalPajak.toLocaleString('id-ID')}
                                            </span>
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </tfoot>
                            )}
                        </Table>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 mt-4 rounded-b-lg">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Menampilkan {Math.min(historyList.length, (currentPage - 1) * pageSize + 1)} - {Math.min(historyList.length, currentPage * pageSize)} dari {historyList.length} riwayat
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-bold px-2 text-slate-700 dark:text-slate-300">
                                    {currentPage} / {totalPages || 1}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Antrian Pajak Dialog */}
            <AntrianPajakDialog
                isOpen={isAntrianDialogOpen}
                onClose={() => setIsAntrianDialogOpen(false)}
                onInputClick={(t) => handleInputPajak(t, true)}
                refreshKey={antrianRefreshKey}
                skpdOptions={skpdOptions}
            />

            {/* Input Pajak Dialog */}
            {isInputDialogOpen && selectedTagihan && (
                <InputPajakDialog
                    isOpen={isInputDialogOpen}
                    onOpenChange={setIsInputDialogOpen}
                    tagihan={selectedTagihan}
                    onSuccess={() => {
                        fetchData();
                        fetchAntrianCount();
                        if (isFromAntrian) {
                            setAntrianRefreshKey(prev => prev + 1);
                            setIsAntrianDialogOpen(true);
                        }
                    }}
                />
            )}
            <PajakDetailDialog
                isOpen={isViewDialogOpen}
                onClose={() => setIsViewDialogOpen(false)}
                tagihan={selectedTagihanForView}
                pajakList={selectedTagihanForView ? pajakData[selectedTagihanForView.id_tagihan] || [] : []}
            />

            {/* Alert Dialog Hapus Custom */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-3 text-red-600">
                            <Trash2 className="h-6 w-6" />
                            Konfirmasi Hapus Data Pajak
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-2">
                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                Apakah Anda yakin ingin menghapus seluruh rincian pajak untuk SP2D berikut?
                            </p>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs break-all text-emerald-700 dark:text-emerald-400 font-bold">
                                {tagihanToDelete?.nomor_sp2d}
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                                <RefreshCw className="h-4 w-4 shrink-0" />
                                <p>Tindakan ini akan mengembalikan status pajak menjadi <strong>'Belum Input'</strong> dan data akan kembali ke daftar antrian.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200 hover:bg-slate-50">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDeletePajak();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 px-6"
                        >
                            {loading ? 'Menghapus...' : 'Ya, Hapus Sekarang'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PortalPajak;
