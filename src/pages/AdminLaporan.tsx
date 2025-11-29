import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets';
import { toast } from 'sonner';
import { FileDownIcon, BarChartIcon, PieChartIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

// Data Interfaces
interface ChartDataItem {
  name: string;
  value: number;
}

interface TagihanDetail {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  jenis_spm: string;
  jenis_tagihan: string;
  uraian: string;
  jumlah_kotor: number;
  status_tagihan: string;
  waktu_input: string;
  sumber_dana?: string;
}

interface SkpdData {
  id: string;
  nama_skpd: string;
  kode_skpd: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666', '#66CCFF'];

const AdminLaporan = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportType, setReportType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [groupByOption, setGroupByOption] = useState<string>('sumber_dana');
  const [selectedSkpdForAnalysis, setSelectedSkpdForAnalysis] = useState<string>('Semua SKPD');
  const [skpdOptionsForAnalysis, setSkpdOptionsForAnalysis] = useState<string[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua (Selesai)');

  const [generatedReportType, setGeneratedReportType] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [tableData, setTableData] = useState<TagihanDetail[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  // Reset selectedStatus and groupByOption when reportType changes
  useEffect(() => {
    if (reportType === 'detail_skpd' || reportType === '') {
      setSelectedStatus('Semua');
    }
    if (reportType !== 'analisis_skpd') {
      setGroupByOption('sumber_dana');
      setSelectedSkpdForAnalysis('Semua SKPD');
      setSelectedStatusFilter('Semua (Selesai)');
    }
    setCurrentPage(1);
  }, [reportType]);

  // Fetch SKPD options for analysis dropdown
  useEffect(() => {
    const fetchSkpdOptions = async () => {
      if (reportType === 'analisis_skpd') {
        try {
          const { data, error } = await supabase
            .from('master_skpd')
            .select('nama_skpd')
            .order('nama_skpd', { ascending: true });

          if (error) throw error;

          const uniqueSkpd = Array.from(new Set(data.map(item => item.nama_skpd)))
            .filter((skpd): skpd is string => skpd !== null && skpd.trim() !== '');

          setSkpdOptionsForAnalysis(['Semua SKPD', ...uniqueSkpd]);
        } catch (error: any) {
          console.error('Error fetching SKPD options for analysis:', error.message);
          toast.error('Gagal memuat daftar SKPD untuk analisis: ' + error.message);
          setSkpdOptionsForAnalysis(['Semua SKPD']);
        }
      }
    };
    fetchSkpdOptions();
  }, [reportType]);


  const handleGenerateReport = async () => {
    if (!reportType) {
      toast.error('Pilih jenis laporan terlebih dahulu.');
      return;
    }

    setLoadingReport(true);
    setGeneratedReportType(null);
    setChartData([]);
    setTableData([]);
    setCurrentPage(1);

    try {
      const startDateISO = dateRange?.from ? dateRange.from.toISOString() : undefined;
      const endDateISO = dateRange?.to ? dateRange.to.toISOString() : undefined;

      const payload: any = {
        reportType,
        startDate: startDateISO,
        endDate: endDateISO,
      };

      if (reportType === 'sumber_dana' || reportType === 'jenis_tagihan') {
        payload.status = selectedStatus !== 'Semua' ? selectedStatus : undefined;
      } else if (reportType === 'analisis_skpd') {
        payload.groupBy = groupByOption;
        payload.skpd = selectedSkpdForAnalysis !== 'Semua SKPD' ? selectedSkpdForAnalysis : undefined;
        payload.statusFilter = selectedStatusFilter;
      }

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: JSON.stringify(payload),
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      if (reportType === 'analisis_skpd') {
        setChartData(data.chartData || []);
        setTableData(data.tableData || []);
      } else {
        setChartData(data || []);
        setTableData(data || []);
      }

      setGeneratedReportType(reportType);
      toast.success('Laporan berhasil dibuat!');
    } catch (error: any) {
      console.error('Error generating report:', error.message);
      toast.error('Gagal membuat laporan: ' + error.message);
      setChartData([]);
      setTableData([]);
      setGeneratedReportType(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!tableData || tableData.length === 0) {
      toast.error('Tidak ada data untuk diunduh.');
      return;
    }

    let headers: string[] = [];
    let data: (string | number)[][] = [];
    let fileName = 'laporan_data.xlsx';

    if (generatedReportType === 'sumber_dana' || generatedReportType === 'jenis_tagihan') {
      headers = [generatedReportType === 'sumber_dana' ? 'Sumber Dana' : 'Jenis Tagihan', 'Total Nilai'];
      data = tableData.map((item: ChartDataItem) => [item.name, item.value]);
      fileName = `laporan_per_${generatedReportType}.xlsx`;
    } else if (generatedReportType === 'analisis_skpd') {
      headers = [
        'ID Tagihan',
        'Nama SKPD',
        'Nomor SPM',
        'Jenis SPM',
        'Jenis Tagihan',
        'Sumber Dana',
        'Uraian',
        'Jumlah Kotor',
        'Status Tagihan',
        'Waktu Input',
      ];
      data = tableData.map((item: TagihanDetail) => [
        item.id_tagihan,
        item.nama_skpd,
        item.nomor_spm,
        item.jenis_spm,
        item.jenis_tagihan,
        item.sumber_dana || '-',
        item.uraian,
        item.jumlah_kotor,
        item.status_tagihan,
        new Date(item.waktu_input).toLocaleString('id-ID'),
      ]);
      fileName = `laporan_${generatedReportType}.xlsx`;
    } else {
      toast.error('Jenis laporan tidak dikenal untuk diunduh.');
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, fileName);

    toast.success('Laporan berhasil diunduh!');
  };

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = itemsPerPage === -1 ? tableData : tableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(tableData.length / itemsPerPage);

  if (loadingPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Memuat Halaman
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Sedang memeriksa hak akses...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900/50 shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Akses Ditolak
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Anda tidak memiliki izin untuk mengakses halaman ini.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <BarChartIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Generate Laporan
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Pilih rentang tanggal dan jenis laporan untuk menghasilkan visualisasi dan ringkasan data
            </p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <FilterIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Filter Laporan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="grid gap-2">
              <Label htmlFor="date-range">Rentang Tanggal</Label>
              <DateRangePickerWithPresets
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-type">Jenis Laporan</Label>
              <Select onValueChange={setReportType} value={reportType}>
                <SelectTrigger id="report-type" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                  <SelectValue placeholder="Pilih Jenis Laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sumber_dana">Laporan per Sumber Dana</SelectItem>
                  <SelectItem value="jenis_tagihan">Laporan per Jenis Tagihan</SelectItem>
                  <SelectItem value="analisis_skpd">Laporan Analisis SKPD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(reportType === 'sumber_dana' || reportType === 'jenis_tagihan') && (
              <div className="grid gap-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                  <SelectTrigger id="status-filter" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua</SelectItem>
                    <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                    <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'analisis_skpd' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="group-by-option">Kelompokkan Berdasarkan</Label>
                  <Select onValueChange={setGroupByOption} value={groupByOption}>
                    <SelectTrigger id="group-by-option" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                      <SelectValue placeholder="Pilih Opsi Pengelompokan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sumber_dana">Sumber Dana</SelectItem>
                      <SelectItem value="jenis_tagihan">Jenis Tagihan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skpd-for-analysis">Pilih SKPD</Label>
                  <Select onValueChange={setSelectedSkpdForAnalysis} value={selectedSkpdForAnalysis}>
                    <SelectTrigger id="skpd-for-analysis" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                      <SelectValue placeholder="Pilih SKPD" />
                    </SelectTrigger>
                    <SelectContent>
                      {skpdOptionsForAnalysis.map((skpd) => (
                        <SelectItem key={skpd} value={skpd}>
                          {skpd}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status-tagihan-filter">Status Tagihan</Label>
                  <Select onValueChange={setSelectedStatusFilter} value={selectedStatusFilter}>
                    <SelectTrigger id="status-tagihan-filter" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                      <SelectValue placeholder="Pilih Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semua (Selesai)">Semua (Selesai)</SelectItem>
                      <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                      <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button
              onClick={handleGenerateReport}
              className="w-full md:col-span-1 lg:col-span-1 flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
              disabled={loadingReport}
            >
              {loadingReport ? 'Membuat Laporan...' : <><BarChartIcon className="h-4 w-4" /> Tampilkan Laporan</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <PieChartIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Visualisasi Laporan
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingReport ? (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Memuat grafik...</p>
              </div>
            </div>
          ) : generatedReportType === 'sumber_dana' && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : generatedReportType === 'jenis_tagihan' && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  paddingAngle={5}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : generatedReportType === 'analisis_skpd' && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Nilai" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
              <div className="text-center space-y-2">
                <PieChartIcon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Area Chart / Grafik Akan Muncul Di Sini</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <BarChartIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Tabel Rangkuman
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Items per page */}
          <div className="mb-5 flex items-center justify-end gap-2">
            <Label htmlFor="items-per-page" className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Tampilkan:
            </Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[100px] h-9 border-slate-300 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="-1">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            {loadingReport ? (
              <div className="h-60 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="relative w-12 h-12 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Memuat tabel...</p>
                </div>
              </div>
            ) : (generatedReportType === 'sumber_dana' || generatedReportType === 'jenis_tagihan') && tableData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">{generatedReportType === 'sumber_dana' ? 'Sumber Dana' : 'Jenis Tagihan'}</TableHead>
                    <TableHead className="text-right font-bold text-emerald-900 dark:text-emerald-100">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTableData.map((item: ChartDataItem, index) => (
                    <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.name}</TableCell>
                      <TableCell className="text-right font-medium text-slate-900 dark:text-white">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : generatedReportType === 'analisis_skpd' && tableData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Nama SKPD</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Nomor SPM</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Jenis SPM</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Jenis Tagihan</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Sumber Dana</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Uraian</TableHead>
                    <TableHead className="text-right font-bold text-emerald-900 dark:text-emerald-100">Jumlah Kotor</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Status</TableHead>
                    <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Waktu Input</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTableData.map((item: TagihanDetail) => (
                    <TableRow key={item.id_tagihan} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.nama_skpd}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{item.nomor_spm}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.jenis_spm}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.jenis_tagihan}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.sumber_dana || '-'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.uraian}</TableCell>
                      <TableCell className="text-right font-medium text-slate-900 dark:text-white">{formatCurrency(item.jumlah_kotor)}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{item.status_tagihan}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{new Date(item.waktu_input).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-60 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <BarChartIcon className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Tabel Rangkuman Akan Muncul Di Sini</p>
                </div>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {tableData.length > 0 && (
            <div className="px-6 py-4 mt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Menampilkan <span className="text-slate-900 dark:text-white font-semibold">{tableData.length === 0 ? 0 : indexOfFirstItem + 1}</span> - <span className="text-slate-900 dark:text-white font-semibold">{Math.min(indexOfLastItem, tableData.length)}</span> dari <span className="text-slate-900 dark:text-white font-semibold">{tableData.length}</span> item
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || itemsPerPage === -1}
                    className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </Button>
                  <div className="px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {currentPage} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || itemsPerPage === -1}
                    className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownloadCSV}
          variant="outline"
          className="flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
          disabled={!generatedReportType || loadingReport || tableData.length === 0}
        >
          <FileDownIcon className="h-4 w-4" /> Download Laporan (XLSX)
        </Button>
      </div>
    </div>
  );
};

export default AdminLaporan;