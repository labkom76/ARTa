import React, { useState, useEffect } from 'react';
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    SearchIcon,
    RefreshCw,
    FileDownIcon,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    FileTextIcon,
    Printer,
    WalletIcon,
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import { getJenisTagihanCode } from '@/utils/spmGenerator';
import { Combobox } from '@/components/ui/combobox';
import { Tagihan } from '@/types/tagihan';
import * as XLSX from 'xlsx';
import PrintRekapPajakDialog from '@/components/PrintRekapPajakDialog';

interface TaxEntry {
    id_pajak: string;
    id_tagihan: string;
    jenis_pajak: string;
    kode_akun: string;
    jumlah_pajak: number;
    ntpn: string;
    ntb: string;
    kode_billing: string;
    // Joined fields from tagihan
    nomor_spm: string;
    nomor_sp2d: string;
    nama_skpd: string;
    jumlah_kotor: number;
    tanggal_sp2d: string;
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

const PortalRiwayatPajak = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 700);
    const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
    const [skpdOptions, setSkpdOptions] = useState<{ value: string; label: string }[]>([]);

    // Period Filters
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Data State
    const [taxHistory, setTaxHistory] = useState<TaxEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Print Dialog State
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{
        column: keyof TaxEntry;
        direction: 'asc' | 'desc';
    }>({ column: 'tanggal_sp2d', direction: 'desc' });

    const handleSort = (column: keyof TaxEntry) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.column === column && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ column, direction });
    };

    const sortedList = [...taxHistory].sort((a, b) => {
        const { column, direction } = sortConfig;
        let valA = a[column];
        let valB = b[column];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
    });

    const paginatedList = sortedList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        fetchSkpdOptions();
    }, []);

    useEffect(() => {
        if (user && (profile?.peran === 'Staf Pajak' || profile?.peran === 'Administrator')) {
            fetchData();
        }
    }, [user, profile, debouncedSearchQuery, selectedSkpd, selectedMonth, selectedYear]);

    const fetchSkpdOptions = async () => {
        try {
            const { data, error } = await supabase
                .from('master_skpd')
                .select('nama_skpd')
                .order('nama_skpd', { ascending: true });

            if (data) {
                const uniqueSkpd = Array.from(new Set(data.filter(item => item.nama_skpd).map(item => item.nama_skpd)))
                    .map(skpd => ({ value: skpd!, label: skpd! }));
                setSkpdOptions([{ value: 'Semua SKPD', label: 'Semua SKPD' }, ...uniqueSkpd]);
            }
        } catch (error: any) {
            console.error('Error fetching SKPD:', error.message);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('database_pajak')
                .select(`
                    *,
                    tagihan:database_tagihan (
                        nomor_spm,
                        nomor_sp2d,
                        nama_skpd,
                        jumlah_kotor,
                        tanggal_sp2d
                    )
                `);

            if (selectedSkpd !== 'Semua SKPD') {
                // Since it's a join, we filter on the joined table's column
                query = query.filter('tagihan.nama_skpd', 'eq', selectedSkpd);
            }

            // Date filtering
            let startDateStr: string;
            let endDateStr: string;
            if (selectedMonth !== 'all') {
                startDateStr = format(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1), 'yyyy-MM-dd');
                endDateStr = format(new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0), 'yyyy-MM-dd');
                query = query.filter('tagihan.tanggal_sp2d', 'gte', startDateStr)
                    .filter('tagihan.tanggal_sp2d', 'lte', endDateStr);
            } else {
                startDateStr = format(new Date(parseInt(selectedYear), 0, 1), 'yyyy-MM-dd');
                endDateStr = format(new Date(parseInt(selectedYear), 11, 31), 'yyyy-MM-dd');
                query = query.filter('tagihan.tanggal_sp2d', 'gte', startDateStr)
                    .filter('tagihan.tanggal_sp2d', 'lte', endDateStr);
            }

            if (debouncedSearchQuery) {
                query = query.or(`ntpn.ilike.%${debouncedSearchQuery}%,tagihan.nomor_spm.ilike.%${debouncedSearchQuery}%,tagihan.nomor_sp2d.ilike.%${debouncedSearchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                const flattenedData = data.map((item: any) => ({
                    ...item,
                    nomor_spm: item.tagihan?.nomor_spm || '-',
                    nomor_sp2d: item.tagihan?.nomor_sp2d || '-',
                    nama_skpd: item.tagihan?.nama_skpd || '-',
                    jumlah_kotor: item.tagihan?.jumlah_kotor || 0,
                    tanggal_sp2d: item.tagihan?.tanggal_sp2d || null,
                }));
                setTaxHistory(flattenedData);
            }
        } catch (error: any) {
            console.error('Error fetching data:', error.message);
            toast.error('Gagal memuat data rekap pajak');
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (taxHistory.length === 0) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        try {
            const exportData = taxHistory.map((h, idx) => ({
                'No.': idx + 1,
                'SKPD': h.nama_skpd,
                'No. SPM': h.nomor_spm,
                'Nilai Belanja': h.jumlah_kotor,
                'No SP2D': h.nomor_sp2d,
                'Nilai Belanja ': h.jumlah_kotor,
                'Kode Akun': h.kode_akun,
                'Jenis Pajak': h.jenis_pajak,
                'Jumlah Pajak': h.jumlah_pajak,
                'NTPN': h.ntpn,
                'NTB': h.ntb,
                'Kode Billing': h.kode_billing
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wscols = [
                { wch: 5 },   // No.
                { wch: 35 },  // SKPD
                { wch: 25 },  // No. SPM
                { wch: 15 },  // Nilai Belanja
                { wch: 25 },  // No SP2D
                { wch: 15 },  // Nilai Belanja
                { wch: 12 },  // Kode Akun
                { wch: 20 },  // Jenis Pajak
                { wch: 15 },  // Jumlah Pajak
                { wch: 20 },  // NTPN
                { wch: 15 },  // NTB
                { wch: 20 }   // Kode Billing
            ];
            ws['!cols'] = wscols;

            // Number formats
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                [3, 5, 8].forEach(colIdx => {
                    const addr = XLSX.utils.encode_cell({ r: R, c: colIdx });
                    if (ws[addr]) ws[addr].z = '#,##0';
                });
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Rekap_Pajak");
            XLSX.writeFile(wb, `Rekap_Pajak_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
            toast.success('Rekap pajak berhasil diekspor!');
        } catch (error: any) {
            toast.error('Gagal mengekspor data: ' + error.message);
        }
    };

    const handlePrint = () => {
        if (taxHistory.length === 0) {
            toast.error('Tidak ada data untuk dicetak');
            return;
        }
        setIsPrintDialogOpen(true);
    };

    if (sessionLoading) return null;
    if (profile?.peran !== 'Staf Pajak' && profile?.peran !== 'Administrator') {
        return <div className="p-8 text-center text-slate-500 font-medium font-mono uppercase">Akses ditolak</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-8">
            {/* Filter Section */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-full md:w-80 space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Pencarian Rekap</label>
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Cari SPM, SP2D, atau NTPN..."
                                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-emerald-500 rounded-lg"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[280px] space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Filter SKPD</label>
                                <Combobox
                                    options={skpdOptions}
                                    value={selectedSkpd}
                                    onValueChange={setSelectedSkpd}
                                    placeholder="Semua SKPD"
                                    className="w-full h-10 rounded-lg"
                                />
                            </div>
                            <div className="w-32 space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Bulan</label>
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg">
                                        <SelectValue placeholder="Bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-28 space-y-1.5">
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest ml-1">Tahun</label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg">
                                        <SelectValue placeholder="Tahun" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => (
                                            <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="ml-auto flex items-end">
                                <Button
                                    variant="ghost"
                                    className="h-10 px-4 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-lg gap-2"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setSelectedSkpd('Semua SKPD');
                                        setSelectedMonth('all');
                                        setSelectedYear(currentYear.toString());
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table Section */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/30">
                            <WalletIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Portal Rekap Pajak</h2>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto whitespace-nowrap">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={fetchData}
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

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleExportExcel}
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all rounded-lg"
                                        disabled={loading || taxHistory.length === 0}
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
                            onClick={handlePrint}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 rounded-lg transition-all hover:scale-105 gap-2 text-sm"
                            disabled={loading || taxHistory.length === 0}
                        >
                            <Printer className="h-4 w-4" />
                            Cetak Laporan
                        </Button>
                    </div>
                </div>

                <div className="relative overflow-x-auto max-h-[750px] scrollbar-thin">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900">
                            <TableRow className="border-none">
                                <TableHead className="w-12 text-center uppercase text-[10px] font-black tracking-widest">No.</TableHead>
                                <TableHead className="w-48 uppercase text-[10px] font-black tracking-widest cursor-pointer" onClick={() => handleSort('nama_skpd')}>SKPD</TableHead>
                                <TableHead className="w-40 uppercase text-[10px] font-black tracking-widest cursor-pointer" onClick={() => handleSort('nomor_spm')}>No. SPM</TableHead>
                                <TableHead className="w-32 uppercase text-[10px] font-black tracking-widest text-right">Nilai Belanja</TableHead>
                                <TableHead className="w-40 uppercase text-[10px] font-black tracking-widest cursor-pointer" onClick={() => handleSort('nomor_sp2d')}>No. SP2D</TableHead>
                                <TableHead className="w-32 uppercase text-[10px] font-black tracking-widest text-right">Nilai Belanja</TableHead>
                                <TableHead className="w-24 uppercase text-[10px] font-black tracking-widest">Kode Akun</TableHead>
                                <TableHead className="w-32 uppercase text-[10px] font-black tracking-widest">Jenis Pajak</TableHead>
                                <TableHead className="w-32 uppercase text-[10px] font-black tracking-widest text-right">Jumlah Pajak</TableHead>
                                <TableHead className="w-40 uppercase text-[10px] font-black tracking-widest">NTPN</TableHead>
                                <TableHead className="w-32 uppercase text-[10px] font-black tracking-widest">NTB</TableHead>
                                <TableHead className="w-40 uppercase text-[10px] font-black tracking-widest">Kode Billing</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-40 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Memuat riwayat rekap...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-40 text-center">
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Data tidak ditemukan</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedList.map((h, idx) => (
                                    <TableRow key={h.id_pajak} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 border-slate-100 dark:border-slate-800">
                                        <TableCell className="text-center text-slate-500 font-mono text-xs">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                                        <TableCell className="font-bold text-slate-900 dark:text-slate-200 text-xs leading-tight">{h.nama_skpd}</TableCell>
                                        <TableCell className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="max-w-[150px] truncate cursor-help">{h.nomor_spm}</div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="font-mono text-xs max-w-md break-all p-3">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Nomor SPM Lengkap</p>
                                                            <p>{h.nomor_spm}</p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-200 text-xs">{h.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="max-w-[150px] truncate cursor-help">{h.nomor_sp2d}</div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="font-mono text-xs">{h.nomor_sp2d}</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400 text-xs">{h.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{h.kode_akun}</TableCell>
                                        <TableCell className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase">{h.jenis_pajak}</TableCell>
                                        <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400 text-xs">{h.jumlah_pajak.toLocaleString('id-ID')}</TableCell>
                                        <TableCell className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">{h.ntpn || '-'}</TableCell>
                                        <TableCell className="font-mono text-[11px] text-slate-500 dark:text-slate-500">{h.ntb || '-'}</TableCell>
                                        <TableCell className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{h.kode_billing || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total {taxHistory.length} Data</p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="rounded-lg h-9 px-4 gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Sebelumnya
                        </Button>
                        <div className="h-9 px-4 flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black text-slate-700 dark:text-slate-300">
                            {currentPage} / {Math.max(1, Math.ceil(taxHistory.length / pageSize))}
                        </div>
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage >= Math.ceil(taxHistory.length / pageSize)}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="rounded-lg h-9 px-4 gap-1"
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            <PrintRekapPajakDialog
                isOpen={isPrintDialogOpen}
                onOpenChange={setIsPrintDialogOpen}
                data={sortedList}
                filters={{
                    month: selectedMonth,
                    year: selectedYear,
                    skpd: selectedSkpd
                }}
            />
        </div>
    );
};

export default PortalRiwayatPajak;
