import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format, parseISO, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import StatusBadge from '@/components/StatusBadge';
import { HistoryIcon, SearchIcon, EyeIcon, Sparkles, FilterIcon, CalendarIcon, Undo2, FileDownIcon } from 'lucide-react';
import TagihanDetailDialog from '@/components/TagihanDetailDialog';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets';
import { DateRange } from 'react-day-picker';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import * as XLSX from 'xlsx';

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
    tanggal_spm: string;
    nomor_urut: number;
    id_pengguna_input: string;
}

const RiwayatTagihan = () => {
    const { user, profile, loading: sessionLoading } = useSession();
    const navigate = useNavigate();
    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('Semua Status');
    const currentYearInt = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>((currentYearInt - 1).toString()); // Default to last year
    const [selectedMonth, setSelectedMonth] = useState<string>('Semua Bulan');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const [isDetailModalOpen, setIsDetailModal] = useState(false);
    const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

    const years = Array.from({ length: 5 }, (_, i) => (currentYearInt - 1 - i).toString()); // Start from last year (2025 if 2026)

    const fetchHistory = async () => {
        if (!user || sessionLoading) return;
        setLoading(true);

        try {
            let query = supabase
                .from('database_tagihan')
                .select('*', { count: 'exact' })
                .eq('id_pengguna_input', user.id);

            // Filtering logic: History is anything BEFORE the current real year, 
            // OR if we explicitly select a year that is less than the current year.
            // But user said "tahun 2025 pindah ke riwayat", assuming 2026 is current.

            if (selectedYear !== 'Semua Tahun') {
                // Use ILIKE on nomor_spm as the most reliable year detector for archiving
                query = query.ilike('nomor_spm', `%/${selectedYear}`);
            }

            if (selectedMonth !== 'Semua Bulan') {
                const monthIdx = parseInt(selectedMonth);
                const yearForMonth = selectedYear !== 'Semua Tahun' ? parseInt(selectedYear) : currentYearInt;
                const monthStart = startOfMonth(new Date(yearForMonth, monthIdx));
                const monthEnd = endOfMonth(new Date(yearForMonth, monthIdx));
                query = query.gte('tanggal_spm', format(monthStart, 'yyyy-MM-dd'))
                    .lte('tanggal_spm', format(monthEnd, 'yyyy-MM-dd'));
            }

            if (dateRange?.from) {
                query = query.gte('tanggal_spm', format(startOfDay(dateRange.from), 'yyyy-MM-dd'));
            }
            if (dateRange?.to) {
                query = query.lte('tanggal_spm', format(endOfDay(dateRange.to), 'yyyy-MM-dd'));
            }

            if (selectedStatus !== 'Semua Status') {
                query = query.eq('status_tagihan', selectedStatus);
            }

            if (searchQuery) {
                query = query.ilike('nomor_spm', `%${searchQuery}%`);
            }

            query = query.order('tanggal_spm', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setTagihanList(data as Tagihan[]);
        } catch (error: any) {
            console.error('Error fetching history:', error.message);
            toast.error('Gagal memuat riwayat tagihan');
        } finally {
            setLoading(false);
        }
    };

    const handleExportToXLSX = () => {
        if (tagihanList.length === 0) {
            toast.info('Tidak ada data tagihan untuk diekspor.');
            return;
        }

        // Create a copy of tagihanList and sort it by nomor_urut ascending
        const sortedTagihanList = [...tagihanList].sort((a, b) => {
            const nomorUrutA = a.nomor_urut ?? 0;
            const nomorUrutB = b.nomor_urut ?? 0;
            return nomorUrutA - nomorUrutB;
        });

        const dataToExport = sortedTagihanList.map(tagihan => ({
            'Nomor SPM': tagihan.nomor_spm,
            'Nama SKPD': tagihan.nama_skpd,
            'Tanggal SPM': tagihan.tanggal_spm ? format(parseISO(tagihan.tanggal_spm), 'dd MMMM yyyy', { locale: localeId }) : '-',
            'Jenis SPM': tagihan.jenis_spm,
            'Jenis Tagihan': tagihan.jenis_tagihan,
            'Uraian': tagihan.uraian,
            'Jumlah Kotor': tagihan.jumlah_kotor,
            'Status Tagihan': tagihan.status_tagihan,
            'Waktu Input': format(new Date(tagihan.waktu_input), 'dd MMMM yyyy HH:mm', { locale: localeId }),
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Riwayat Tagihan SKPD");
        XLSX.writeFile(wb, `riwayat_tagihan_${selectedYear}.xlsx`);

        toast.success('Data riwayat berhasil diekspor ke XLSX!');
    };

    useEffect(() => {
        fetchHistory();
    }, [user, sessionLoading, selectedYear, selectedMonth, dateRange, selectedStatus, searchQuery]);

    // Handle year selection defaults
    useEffect(() => {
        setSelectedYear((currentYearInt - 1).toString());
    }, [currentYearInt]);

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-600 to-slate-400 bg-clip-text text-transparent mb-2 pb-1 inline-flex items-center gap-3">
                    <HistoryIcon className="h-10 w-10 text-slate-600 dark:text-slate-400" />
                    Riwayat Tagihan SKPD
                </h1>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        Arsip tagihan tahun-tahun sebelumnya
                    </p>

                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 transition-all rounded-lg"
                                        onClick={handleExportToXLSX}
                                        disabled={loading || tagihanList.length === 0}
                                    >
                                        <FileDownIcon className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Export ke XLSX</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

                        <Button
                            variant="outline"
                            onClick={() => navigate('/portal-skpd')}
                            className="h-9 flex items-center gap-2 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-4 rounded-lg font-medium transition-all"
                        >
                            <Undo2 className="h-4 w-4" />
                            Portal SKPD
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <FilterIcon className="h-5 w-5 text-slate-500" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filter Arsip</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Pilih Tahun</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tahun" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Pilih Bulan</label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Bulan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Semua Bulan">Semua Bulan</SelectItem>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                        {format(new Date(2000, i, 1), 'MMMM', { locale: localeId })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Rentang Tanggal</label>
                        <DateRangePickerWithPresets date={dateRange} onDateChange={setDateRange} className="w-full" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Status</label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Semua Status">Semua Status</SelectItem>
                                <SelectItem value="Selesai">Selesai</SelectItem>
                                <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                                <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                                <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                                <SelectItem value="Tinjau Kembali">Tinjau Kembali</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Cari SPM</label>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Cari..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Card className="border-emerald-100 dark:border-emerald-900/50 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-emerald-50/50 dark:bg-emerald-950/20">
                                <TableRow>
                                    <TableHead className="w-[60px] text-center font-bold">No.</TableHead>
                                    <TableHead className="font-bold">Tanggal SPM</TableHead>
                                    <TableHead className="font-bold">Nomor SPM</TableHead>
                                    <TableHead className="font-bold">Jenis Tagihan</TableHead>
                                    <TableHead className="font-bold">Uraian</TableHead>
                                    <TableHead className="font-bold">Jumlah Kotor</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="w-[80px] text-center font-bold">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                                            Memuat data riwayat...
                                        </TableCell>
                                    </TableRow>
                                ) : tagihanList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-slate-500 italic">
                                            Tidak ada rekaman tagihan untuk periode ini.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tagihanList.map((tagihan, index) => (
                                        <TableRow key={tagihan.id_tagihan} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="text-sm">
                                                        {tagihan.tanggal_spm ? format(parseISO(tagihan.tanggal_spm), 'dd MMM yyyy', { locale: localeId }) : '-'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-semibold text-slate-900 dark:text-emerald-400">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help">{tagihan.nomor_spm}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{tagihan.nomor_spm}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell className="text-sm">{tagihan.jenis_tagihan}</TableCell>
                                            <TableCell className="max-w-[300px]">
                                                <p className="text-sm line-clamp-2 text-slate-600 dark:text-slate-400">{tagihan.uraian}</p>
                                            </TableCell>
                                            <TableCell className="font-semibold text-sm">
                                                Rp {tagihan.jumlah_kotor.toLocaleString('id-ID')}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={tagihan.status_tagihan} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                    onClick={() => {
                                                        setSelectedTagihanForDetail(tagihan);
                                                        setIsDetailModal(true);
                                                    }}
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <TagihanDetailDialog
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModal(false)}
                tagihan={selectedTagihanForDetail}
            />
        </div>
    );
};

export default RiwayatTagihan;
