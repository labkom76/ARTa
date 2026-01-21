import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
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
import { Combobox } from '@/components/ui/combobox';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchIcon, ListIcon, ChevronLeft, ChevronRight, PlusCircle, Clock, CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import { Tagihan } from '@/types/tagihan';

import { cn } from '@/lib/utils';

interface SkpdOption {
    value: string;
    label: string;
}

interface AntrianSP2DDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onRegisterClick: (tagihan: Tagihan) => void;
    skpdOptions: SkpdOption[];
}


const AntrianSP2DDialog: React.FC<AntrianSP2DDialogProps> = ({
    isOpen,
    onClose,
    onRegisterClick,
    skpdOptions,
}) => {
    // Independent filter states
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // Data and pagination states
    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [queueRange, setQueueRange] = useState<{ oldest: string | null; newest: string | null }>({ oldest: null, newest: null });
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // Fetch data whenever filters or page change
    useEffect(() => {
        if (isOpen) {
            fetchTagihan();
        }
    }, [isOpen, selectedSkpd, dateRange, debouncedSearch, currentPage]);

    const fetchTagihan = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('database_tagihan')
                .select('*', { count: 'exact' })
                .eq('status_tagihan', 'Diteruskan');

            // Search filter (Server-side)
            if (debouncedSearch) {
                query = query.ilike('nomor_spm', `%${debouncedSearch}%`);
            }

            // Date Range filter
            if (dateRange?.from) {
                const startDate = startOfDay(dateRange.from).toISOString();
                const endDate = dateRange.to
                    ? endOfDay(dateRange.to).toISOString()
                    : endOfDay(dateRange.from).toISOString();

                query = query.gte('waktu_verifikasi', startDate)
                    .lte('waktu_verifikasi', endDate);
            } else {
                // DEFAULT LOGIC: Automaticaly filter by current year
                const now = new Date();
                const startDate = startOfYear(now).toISOString();
                const endDate = endOfYear(now).toISOString();

                query = query.gte('waktu_verifikasi', startDate)
                    .lte('waktu_verifikasi', endDate);
            }

            // SKPD filter (Server-side)
            if (selectedSkpd !== 'Semua SKPD') {
                query = query.eq('nama_skpd', selectedSkpd);
            }

            // 1. Fetch Summary (Oldest & Newest) for the current filter
            // This stays stable regardless of pagination
            let summaryQuery = supabase
                .from('database_tagihan')
                .select('waktu_verifikasi')
                .eq('status_tagihan', 'Diteruskan');

            if (debouncedSearch) summaryQuery = summaryQuery.ilike('nomor_spm', `%${debouncedSearch}%`);

            if (dateRange?.from) {
                const startDate = startOfDay(dateRange.from).toISOString();
                const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();
                summaryQuery = summaryQuery.gte('waktu_verifikasi', startDate).lte('waktu_verifikasi', endDate);
            } else {
                const now = new Date();
                summaryQuery = summaryQuery.gte('waktu_verifikasi', startOfYear(now).toISOString()).lte('waktu_verifikasi', endOfYear(now).toISOString());
            }

            if (selectedSkpd !== 'Semua SKPD') summaryQuery = summaryQuery.eq('nama_skpd', selectedSkpd);

            // Get oldest
            const { data: oldestData } = await summaryQuery.order('waktu_verifikasi', { ascending: true }).limit(1);
            // Get newest
            const { data: newestData } = await summaryQuery.order('waktu_verifikasi', { ascending: false }).limit(1);

            setQueueRange({
                oldest: oldestData?.[0]?.waktu_verifikasi || null,
                newest: newestData?.[0]?.waktu_verifikasi || null
            });

            // 2. Fetch Paginated List
            const { data, error, count } = await query
                .order('waktu_verifikasi', { ascending: true })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

            if (error) throw error;

            setTagihanList((data as Tagihan[]) || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            toast.error('Gagal memuat antrian: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedList = tagihanList;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
                <div className="space-y-6 py-4">
                    {/* Unified Dashboard Summary Card */}
                    <div className="bg-white dark:bg-slate-900 border border-emerald-100/50 dark:border-emerald-900/30 rounded-3xl overflow-hidden shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            {/* Left Side: General Stats */}
                            <div className="p-6 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 flex items-center gap-5 border-b md:border-b-0 md:border-r border-emerald-100/50 dark:border-emerald-900/30">
                                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-emerald-100/50 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <ListIcon className="h-7 w-7" />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-emerald-600/70 dark:text-emerald-400/50 uppercase tracking-[0.2em] mb-1">Status Antrian</h4>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                                            {totalCount}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest translate-y-[-2px]">
                                            Tagihan
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Oldest Tagihan */}
                            <div className="p-6 flex items-center gap-5 bg-white dark:bg-slate-900">
                                <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30">
                                    <Clock className="h-7 w-7 animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-amber-600/70 dark:text-amber-400/50 uppercase tracking-[0.2em] mb-1">Rentang Antrian</h4>
                                    {queueRange.oldest ? (
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            <span className="text-slate-400 font-medium mr-1 uppercase text-[10px]">Dari</span>
                                            {format(parseISO(queueRange.oldest), 'dd MMM yyyy (HH:mm)', { locale: localeId })}
                                            {queueRange.newest && queueRange.newest !== queueRange.oldest && (
                                                <>
                                                    <span className="mx-2 text-slate-300">-</span>
                                                    <span className="text-slate-400 font-medium mr-1 uppercase text-[10px]">Sampai</span>
                                                    {format(parseISO(queueRange.newest), 'dd MMM yyyy (HH:mm)', { locale: localeId })}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs font-bold text-slate-400">Tidak ada antrian</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Filter Section */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative group">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <Input
                                    placeholder="Cari nomor SPM..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-11 h-12 bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-2xl font-medium placeholder:text-slate-400"
                                />
                            </div>

                            {/* SKPD Filter */}
                            <div className="w-full lg:w-72">
                                <Combobox
                                    options={skpdOptions}
                                    value={selectedSkpd}
                                    onValueChange={(val) => {
                                        setSelectedSkpd(val);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Semua SKPD"
                                    className="h-12 bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 rounded-2xl"
                                />
                            </div>

                            {/* Date Picker */}
                            <div className="w-full lg:w-72">
                                <DateRangePickerWithPresets
                                    date={dateRange}
                                    onDateChange={(range) => {
                                        setDateRange(range);
                                        setCurrentPage(1);
                                    }}
                                    className="h-12 bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden [&>div>button]:h-full [&>div>button]:border-none [&>div>button]:hover:bg-emerald-50/50 [&>div>button]:dark:hover:bg-emerald-950/30"
                                    align="end"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        <Table className="table-fixed w-full">
                            <TableHeader className="bg-gray-50 dark:bg-slate-800">
                                <TableRow>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[120px]">Diteruskan</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[200px]">No. SPM</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300">SKPD</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[100px]">Jenis</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[130px] text-right">Jumlah</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[80px] text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="relative w-12 h-12 mx-auto">
                                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                                                </div>
                                                <p className="text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">Memuat antrian...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-gray-600 dark:text-gray-400">
                                            Tidak ada tagihan dalam antrian.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedList.map((t) => {
                                        const isUrgent = t.waktu_verifikasi && (new Date().getTime() - new Date(t.waktu_verifikasi).getTime() > 24 * 60 * 60 * 1000);

                                        return (
                                            <TableRow
                                                key={t.id_tagihan}
                                                className={cn(
                                                    "hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors",
                                                    isUrgent && "bg-red-50/30 dark:bg-red-950/10 hover:bg-red-100/30 dark:hover:bg-red-900/20"
                                                )}
                                            >
                                                <TableCell>
                                                    <div className={cn(
                                                        "text-[11px] font-bold px-2.5 py-1.5 rounded-lg border w-fit uppercase flex items-center gap-1.5 shadow-sm transition-all",
                                                        isUrgent
                                                            ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
                                                            : "bg-emerald-50/50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                                                    )}>
                                                        {isUrgent && <Clock className="h-3.5 w-3.5 animate-pulse" />}
                                                        <div className="flex flex-col leading-tight">
                                                            <span className="font-black whitespace-nowrap">{t.waktu_verifikasi ? format(parseISO(t.waktu_verifikasi), 'dd/MM/yyyy') : '-'}</span>
                                                            <span className="text-[9px] opacity-70">{t.waktu_verifikasi ? format(parseISO(t.waktu_verifikasi), 'HH:mm') : '-'}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate w-full cursor-help">
                                                                    {t.nomor_spm}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs font-mono">{t.nomor_spm}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                                <TableCell>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="text-sm text-slate-700 dark:text-slate-300 truncate w-full cursor-help font-medium">
                                                                    {t.nama_skpd}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p className="text-xs max-w-[300px]">{t.nama_skpd}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                                        {t.jenis_tagihan}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                                                        Rp{t.jumlah_kotor.toLocaleString('id-ID')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    onClick={() => onRegisterClick(t)}
                                                                    size="icon"
                                                                    className={cn(
                                                                        "h-9 w-9 rounded-xl transition-all hover:scale-110 shadow-sm",
                                                                        isUrgent ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                    )}
                                                                >
                                                                    <PlusCircle className="h-5 w-5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{isUrgent ? 'Proses Antrian Lama!' : 'Register SP2D'}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {!loading && totalCount > 0 && (
                        <div className="flex items-center justify-between px-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} dari {totalCount} tagihan
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[80px] text-center">
                                    Hal {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AntrianSP2DDialog;
