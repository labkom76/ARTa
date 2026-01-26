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
import { SearchIcon, PlusCircle, ChevronLeft, ChevronRight, CalculatorIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import { Tagihan } from '@/types/tagihan';

interface SkpdOption {
    value: string;
    label: string;
}

interface AntrianPajakDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onInputClick: (tagihan: Tagihan) => void;
    skpdOptions: SkpdOption[];
    refreshKey?: number;
}

import { DateRangePickerWithPresets } from './DateRangePickerWithPresets';
import { DateRange } from 'react-day-picker';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';

const AntrianPajakDialog: React.FC<AntrianPajakDialogProps> = ({
    isOpen,
    onClose,
    onInputClick,
    skpdOptions,
    refreshKey,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    useEffect(() => {
        if (isOpen) {
            fetchAntrian();
        }
    }, [isOpen, selectedSkpd, dateRange, debouncedSearch, currentPage, refreshKey]);

    const fetchAntrian = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('database_tagihan')
                .select('*', { count: 'exact' })
                .eq('status_tagihan', 'Selesai')
                .or(`status_pajak.neq.Selesai,status_pajak.is.null`);

            if (debouncedSearch) {
                query = query.or(`nomor_spm.ilike.%${debouncedSearch}%,nama_skpd.ilike.%${debouncedSearch}%,nomor_sp2d.ilike.%${debouncedSearch}%`);
            }

            if (dateRange?.from) {
                const startDateStr = startOfDay(dateRange.from).toISOString();
                const endDateStr = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();
                query = query.gte('tanggal_sp2d', startDateStr).lte('tanggal_sp2d', endDateStr);
            } else {
                // Background fallback: Current Month if dateRange is cleared
                const now = new Date();
                const startDateStr = startOfMonth(now).toISOString();
                const endDateStr = endOfMonth(now).toISOString();
                query = query.gte('tanggal_sp2d', startDateStr).lte('tanggal_sp2d', endDateStr);
            }

            if (selectedSkpd !== 'Semua SKPD') {
                query = query.eq('nama_skpd', selectedSkpd);
            }

            const { data, error, count } = await query
                .order('nomor_urut_sp2d', { ascending: true })
                .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

            if (error) throw error;

            setTagihanList((data as Tagihan[]) || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            toast.error('Gagal memuat antrian pajak: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20">
                <DialogHeader className="border-b border-blue-100 dark:border-blue-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <CalculatorIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Antrian Input Pajak</DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                            Daftar tagihan yang sudah terbit SP2D dan siap diinput rincian pajaknya
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Filters */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <div className="flex flex-col lg:flex-row items-center gap-3">
                            <div className="relative group flex-1 w-full">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Cari No. SP2D atau SKPD..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-11 h-11 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                <div className="w-full sm:w-60">
                                    <Combobox
                                        options={skpdOptions}
                                        value={selectedSkpd}
                                        onValueChange={(val) => {
                                            setSelectedSkpd(val);
                                            setCurrentPage(1);
                                        }}
                                        placeholder="Filter SKPD"
                                        className="w-full h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    />
                                </div>
                                <div className="w-full sm:w-64">
                                    <DateRangePickerWithPresets
                                        date={dateRange}
                                        onDateChange={(val) => {
                                            setDateRange(val);
                                            setCurrentPage(1);
                                        }}
                                        placeholder="Filter Tgl SP2D"
                                        className="w-full"
                                        align="end"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        <Table className="table-fixed w-full">
                            <TableHeader className="bg-gray-50 dark:bg-slate-800">
                                <TableRow>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[120px]">Tgl. SP2D</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[200px]">No. SP2D</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300">SKPD</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[130px] text-right">Jumlah</TableHead>
                                    <TableHead className="text-gray-700 dark:text-slate-300 w-[80px] text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="relative w-12 h-12 mx-auto">
                                                    <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900"></div>
                                                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 dark:border-blue-400 border-t-transparent animate-spin"></div>
                                                </div>
                                                <p className="text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Memuat antrian...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : tagihanList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-gray-600 dark:text-gray-400">
                                            Tidak ada tagihan dalam antrian.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tagihanList.map((t) => (
                                        <TableRow key={t.id_tagihan} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <TableCell>
                                                <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 w-fit">
                                                    {t.tanggal_sp2d ? format(parseISO(t.tanggal_sp2d), 'dd/MM/yyyy', { locale: localeId }) : '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate w-full cursor-help">
                                                                {t.nomor_sp2d}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs font-mono">{t.nomor_sp2d}</p>
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
                                            <TableCell className="text-right">
                                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                                    Rp{t.jumlah_kotor.toLocaleString('id-ID')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                onClick={() => onInputClick(t)}
                                                                size="icon"
                                                                className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                            >
                                                                <PlusCircle className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Input Pajak</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                        </TableRow>
                                    ))
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
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600"
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
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600"
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

export default AntrianPajakDialog;
