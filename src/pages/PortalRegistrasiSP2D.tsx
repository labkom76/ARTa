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
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import useDebounce from '@/hooks/use-debounce';
import { getJenisTagihanCode } from '@/utils/spmGenerator';
import { Combobox } from '@/components/ui/combobox';
import { Tagihan } from '@/types/tagihan';
import * as XLSX from 'xlsx';
import PrintSP2DReportDialog from '@/components/PrintSP2DReportDialog';

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

const PortalRegistrasiSP2D = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 700);
    const [selectedSkpd, setSelectedSkpd] = useState<string>('Semua SKPD');
    const [skpdOptions, setSkpdOptions] = useState<SkpdOption[]>([]);

    // Period Filters
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

    // Data State
    const [historyList, setHistoryList] = useState<Tagihan[]>([]);
    const [loading, setLoading] = useState(false);
    const [nomorSp2dSetting, setNomorSp2dSetting] = useState('04.0');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Print Dialog State
    const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

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

    const formatNoSP2D = (noSpm: string) => {
        if (!noSpm) return '-';
        const parts = noSpm.split('/');
        if (parts.length < 2) return noSpm;

        // Replace second part with the setting from admin
        parts[1] = nomorSp2dSetting;
        return parts.join('/');
    };

    const sortedList = [...historyList].sort((a, b) => {
        const { column, direction } = sortConfig;
        let valA = a[column as keyof Tagihan];
        let valB = b[column as keyof Tagihan];

        if (column === 'nomor_urut_sp2d') {
            valA = a.nomor_urut_sp2d || 0;
            valB = b.nomor_urut_sp2d || 0;
        }

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
        fetchSetting();
    }, []);

    useEffect(() => {
        if (user && (profile?.peran === 'Register SP2D' || profile?.peran === 'Administrator')) {
            fetchData();
        }
    }, [user, profile, debouncedSearchQuery, selectedSkpd, selectedMonth, selectedYear]);

    const fetchSetting = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'nomor_sp2d')
                .single();
            if (data) setNomorSp2dSetting(data.value);
        } catch (error) {
            console.error('Error fetching setting:', error);
        }
    };

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
                .gte('tanggal_sp2d', startDateStr)
                .lte('tanggal_sp2d', endDateStr);

            if (debouncedSearchQuery) {
                query = query.ilike('nomor_spm', `%${debouncedSearchQuery}%`);
            }
            if (selectedSkpd !== 'Semua SKPD') {
                query = query.eq('nama_skpd', selectedSkpd);
            }

            const { data, error } = await query;
            if (error) throw error;
            setHistoryList(data as Tagihan[]);
        } catch (error: any) {
            console.error('Error fetching data:', error.message);
            toast.error('Gagal memuat data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (historyList.length === 0) {
            toast.error('Tidak ada data untuk diekspor');
            return;
        }

        try {
            // Map data including the new 'CATATAN' column
            const exportData = historyList.map(h => ({
                'No. Reg.': h.nomor_urut_sp2d || '-',
                'TGL. SP2D': h.tanggal_sp2d ? format(parseISO(h.tanggal_sp2d), 'dd/MM/yyyy') : '-',
                'NO. SP2D': h.nomor_sp2d || formatNoSP2D(h.nomor_spm),
                'JENIS': getJenisTagihanCode(h.jenis_tagihan),
                'S K P D': h.nama_skpd,
                'URAIAN': h.uraian,
                'JUMLAH': h.jumlah_kotor,
                'NAMA BANK': h.nama_bank || '-',
                'TANGGAL DISERAHKAN KE BSG': h.tanggal_bsg ? format(parseISO(h.tanggal_bsg), 'dd/MM/yyyy') : '-',
                'CATATAN': h.catatan_sp2d || '-'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);

            // Set precise column widths matching reference style
            const wscols = [
                { wch: 8 },   // No. Reg.
                { wch: 15 },  // TGL. SP2D
                { wch: 25 },  // NO. SP2D
                { wch: 8 },   // JENIS
                { wch: 40 },  // S K P D
                { wch: 60 },  // URAIAN
                { wch: 20 },  // JUMLAH
                { wch: 15 },  // NAMA BANK
                { wch: 25 },  // TANGGAL DISERAHKAN KE BSG
                { wch: 40 }   // CATATAN
            ];
            ws['!cols'] = wscols;

            // Apply number format to JUMLAH column (Column G / index 6)
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: 6 });
                if (ws[cellAddress]) {
                    ws[cellAddress].z = '#,##0'; // Standard thousands separator format
                }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Register_SP2D");

            // Generate a more descriptive dynamic filename
            const monthLabel = selectedMonth === 'all' ? 'Semua_Bulan' : months.find(m => m.value === selectedMonth)?.label;
            const filename = `Register_SP2D_${monthLabel}_${selectedYear}.xlsx`;

            XLSX.writeFile(wb, filename);
            toast.success('Laporan Excel berhasil diunduh!');
        } catch (error: any) {
            console.error('Export Error:', error);
            toast.error('Gagal mengekspor data: ' + error.message);
        }
    };

    const handlePrint = () => {
        if (historyList.length === 0) {
            toast.error('Tidak ada data untuk dicetak');
            return;
        }
        setIsPrintDialogOpen(true);
    };

    if (sessionLoading) return null;
    if (profile?.peran !== 'Register SP2D' && profile?.peran !== 'Administrator') {
        return <div className="p-8 text-center text-slate-500">Akses ditolak.</div>;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-8">
            {/* Filter Section */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Cari No. SPM / SP2D..."
                                    className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-emerald-500 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <Combobox
                                options={skpdOptions}
                                value={selectedSkpd}
                                onValueChange={setSelectedSkpd}
                                placeholder="Pilih SKPD..."
                                className="w-full h-10 rounded-xl"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                    <SelectTrigger className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl">
                                        <SelectValue placeholder="Bulan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl">
                                        <SelectValue placeholder="Tahun" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => (
                                            <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table Section */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                            <FileTextIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Daftar Registrasi SP2D
                        </h2>
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
                                        disabled={loading || historyList.length === 0}
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
                            disabled={loading || historyList.length === 0}
                        >
                            <Printer className="h-4 w-4" />
                            Cetak Laporan
                        </Button>
                    </div>
                </div>

                <div className="relative overflow-x-auto max-h-[850px] scrollbar-thin">
                    <Table>
                        <TableHeader className="sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-sm">
                            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-none hover:bg-transparent">
                                <TableHead className="w-[80px] font-bold text-slate-700 dark:text-slate-300">
                                    <button onClick={() => handleSort('nomor_urut_sp2d')} className="flex items-center gap-1 hover:text-emerald-600 transition-colors uppercase text-[11px] tracking-wider">
                                        No. Reg. {sortConfig.column === 'nomor_urut_sp2d' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </button>
                                </TableHead>
                                <TableHead className="w-[120px] font-bold text-slate-700 dark:text-slate-300">
                                    <button onClick={() => handleSort('tanggal_sp2d')} className="flex items-center gap-1 hover:text-emerald-600 transition-colors uppercase text-[11px] tracking-wider">
                                        TGL. SP2D {sortConfig.column === 'tanggal_sp2d' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </button>
                                </TableHead>
                                <TableHead className="w-[280px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                                    No. SP2D
                                </TableHead>
                                <TableHead className="w-[80px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                                    Jenis
                                </TableHead>
                                <TableHead className="w-[250px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                                    SKPD
                                </TableHead>
                                <TableHead className="w-[350px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                                    Uraian
                                </TableHead>
                                <TableHead className="w-[150px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider text-right">
                                    Jumlah
                                </TableHead>
                                <TableHead className="w-[150px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                                    Nama Bank
                                </TableHead>
                                <TableHead className="w-[150px] font-bold text-slate-700 dark:text-slate-300 uppercase text-[11px] tracking-wider">
                                    Tgl. Serah BSG
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                                            <p className="text-sm text-slate-500 font-medium">Memuat data...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center text-slate-500 font-medium font-mono text-sm uppercase">
                                        Tidak ada data ditemukan
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedList.map((item) => (
                                    <TableRow key={item.id_tagihan} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-100 dark:border-slate-800">
                                        <TableCell className="font-bold text-slate-900 dark:text-slate-200">{item.nomor_urut_sp2d}</TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                            {item.tanggal_sp2d ? format(parseISO(item.tanggal_sp2d), 'dd/MM/yyyy') : '-'}
                                        </TableCell>
                                        <TableCell className="font-mono text-[13px] text-emerald-700 dark:text-emerald-400 font-bold leading-tight break-all">
                                            {item.nomor_sp2d || formatNoSP2D(item.nomor_spm)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase">
                                                {getJenisTagihanCode(item.jenis_tagihan)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-bold leading-snug">
                                            {item.nama_skpd}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed max-w-[350px]">
                                            {item.uraian}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-200">
                                            {new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}
                                        </TableCell>
                                        <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-tight">
                                            {item.nama_bank || '-'}
                                        </TableCell>
                                        <TableCell className="text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs">
                                            {item.tanggal_bsg ? format(parseISO(item.tanggal_bsg), 'dd/MM/yyyy') : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <label className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Baris :</label>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                                setPageSize(parseInt(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[85px] h-8 text-xs bg-transparent border-none focus:ring-0 font-bold text-emerald-700 dark:text-emerald-400">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium ml-4">
                            Menampilkan {Math.min((currentPage - 1) * pageSize + 1, historyList.length)} - {Math.min(currentPage * pageSize, historyList.length)} dari {historyList.length} data
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="hover:bg-white dark:hover:bg-slate-800 rounded-xl px-4"
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Sebelumnya
                        </Button>
                        <div className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 shadow-sm">
                            {currentPage} / {Math.ceil(historyList.length / pageSize) || 1}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= Math.ceil(historyList.length / pageSize)}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="hover:bg-white dark:hover:bg-slate-800 rounded-xl px-4"
                        >
                            Berikutnya
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>

            <PrintSP2DReportDialog
                isOpen={isPrintDialogOpen}
                onOpenChange={setIsPrintDialogOpen}
                data={sortedList}
                nomorSp2dSetting={nomorSp2dSetting}
                filters={{
                    month: selectedMonth,
                    year: selectedYear,
                    skpd: selectedSkpd
                }}
            />
        </div>
    );
};

export default PortalRegistrasiSP2D;
