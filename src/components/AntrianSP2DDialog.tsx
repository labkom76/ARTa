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
import { SearchIcon, ListIcon, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import { Tagihan } from '@/types/tagihan';

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
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Data and pagination states
    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    // Fetch data whenever filters or page change
    useEffect(() => {
        if (isOpen) {
            fetchTagihan();
        }
    }, [isOpen, selectedSkpd, selectedMonth, selectedYear, debouncedSearch, currentPage]);

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

            // Period filter
            if (selectedMonth !== 'all') {
                const startDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 1);
                const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0, 23, 59, 59);

                query = query.gte('waktu_verifikasi', startDate.toISOString())
                    .lte('waktu_verifikasi', endDate.toISOString());
            } else {
                // Filter by year only when 'Semua Bulan' is selected
                const startDate = new Date(parseInt(selectedYear), 0, 1);
                const endDate = new Date(parseInt(selectedYear), 11, 31, 23, 59, 59);
                query = query.gte('waktu_verifikasi', startDate.toISOString())
                    .lte('waktu_verifikasi', endDate.toISOString());
            }

            // SKPD filter (Server-side)
            if (selectedSkpd !== 'Semua SKPD') {
                query = query.eq('nama_skpd', selectedSkpd);
            }

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
                <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <ListIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">Antrian Penerbitan SP2D</DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
                            Daftar tagihan yang sudah diteruskan dan siap diregistrasi
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Filters */}
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative group flex-1">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <Input
                                    placeholder="Cari nomor SPM di antrian..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-11 h-12 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-xl font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <div className="w-full sm:w-64">
                                <Combobox
                                    options={skpdOptions}
                                    value={selectedSkpd}
                                    onValueChange={(val) => {
                                        setSelectedSkpd(val);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Filter SKPD"
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="w-full sm:w-48">
                                <Combobox
                                    options={months}
                                    value={selectedMonth}
                                    onValueChange={(val) => {
                                        setSelectedMonth(val);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Filter Bulan"
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
                                />
                            </div>
                            <div className="w-full sm:w-32">
                                <Combobox
                                    options={years}
                                    value={selectedYear}
                                    onValueChange={(val) => {
                                        setSelectedYear(val);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="Filter Tahun"
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
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
                                    paginatedList.map((t) => (
                                        <TableRow key={t.id_tagihan} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <TableCell>
                                                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800/50 w-fit">
                                                    {t.waktu_verifikasi ? format(parseISO(t.waktu_verifikasi), 'dd/MM/yyyy HH:mm', { locale: localeId }) : '-'}
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
                                                            <div className="text-sm text-slate-700 dark:text-slate-300 truncate w-full cursor-help">
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
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    {t.jenis_tagihan}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
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
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 w-9 rounded-lg transition-all hover:scale-110 shadow-sm"
                                                            >
                                                                <PlusCircle className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Register SP2D</p>
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
