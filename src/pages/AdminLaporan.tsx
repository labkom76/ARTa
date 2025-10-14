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
import { FileDownIcon, BarChartIcon, PieChartIcon } from 'lucide-react'; // Import PieChartIcon
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart, // Import PieChart
  Pie,      // Import Pie
  Cell,     // Import Cell for PieChart colors
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import Papa from 'papaparse'; // Import Papa Parse
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'; // Import Pagination components

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
  sumber_dana?: string; // Added for detail table
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
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua'); // New state for status filter
  const [groupByOption, setGroupByOption] = useState<string>('sumber_dana'); // New state for group by
  const [selectedSkpdForAnalysis, setSelectedSkpdForAnalysis] = useState<string>('Semua SKPD'); // New state for selected SKPD in analysis
  const [skpdOptionsForAnalysis, setSkpdOptionsForAnalysis] = useState<string[]>([]); // New state for SKPD options

  const [generatedReportType, setGeneratedReportType] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]); // Separate state for chart data
  const [tableData, setTableData] = useState<TagihanDetail[]>([]); // Separate state for table data
  const [loadingReport, setLoadingReport] = useState(false); // New loading state for report generation

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
      setGroupByOption('sumber_dana'); // Reset to default when not in analysis mode
      setSelectedSkpdForAnalysis('Semua SKPD'); // Reset SKPD selection
    }
    setCurrentPage(1); // Reset page on report type change
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
    setGeneratedReportType(null); // Clear previous report type
    setChartData([]); // Clear previous chart data
    setTableData([]); // Clear previous table data
    setCurrentPage(1); // Reset to first page on new report generation

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
        setChartData(data || []); // For 'sumber_dana' and 'jenis_tagihan'
        setTableData(data || []); // For 'detail_skpd' and also for aggregated reports if needed in table
      }
      
      setGeneratedReportType(reportType); // Set generated report type only on success
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
    if (!tableData || tableData.length === 0) { // Use tableData for CSV
      toast.error('Tidak ada data untuk diunduh.');
      return;
    }

    let csvData: any[] = [];
    let fileName = 'laporan_data.csv';

    // Customize CSV headers and data based on report type
    if (generatedReportType === 'sumber_dana' || generatedReportType === 'jenis_tagihan') {
      csvData = tableData.map((item: ChartDataItem) => ({
        [generatedReportType === 'sumber_dana' ? 'Sumber Dana' : 'Jenis Tagihan']: item.name,
        'Total Nilai': item.value,
      }));
      fileName = `laporan_per_${generatedReportType}.csv`;
    } else if (generatedReportType === 'detail_skpd' || generatedReportType === 'analisis_skpd') { // Use tableData for detail/analysis
      csvData = tableData.map((item: TagihanDetail) => ({
        'ID Tagihan': item.id_tagihan,
        'Nama SKPD': item.nama_skpd,
        'Nomor SPM': item.nomor_spm,
        'Jenis SPM': item.jenis_spm,
        'Jenis Tagihan': item.jenis_tagihan,
        'Sumber Dana': item.sumber_dana || '-',
        'Uraian': item.uraian,
        'Jumlah Kotor': item.jumlah_kotor,
        'Status Tagihan': item.status_tagihan,
        'Waktu Input': new Date(item.waktu_input).toLocaleString('id-ID'),
      }));
      fileName = `laporan_${generatedReportType}.csv`;
    } else {
      toast.error('Jenis laporan tidak dikenal untuk diunduh.');
      return;
    }

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan berhasil diunduh!');
  };

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = tableData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(tableData.length / itemsPerPage);

  if (loadingPage) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Generate Laporan</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Pilih rentang tanggal dan jenis laporan untuk menghasilkan visualisasi dan ringkasan data.
      </p>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end"> {/* Adjusted grid columns */}
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
              <SelectTrigger id="report-type" className="w-full">
                <SelectValue placeholder="Pilih Jenis Laporan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sumber_dana">Laporan per Sumber Dana</SelectItem>
                <SelectItem value="jenis_tagihan">Laporan per Jenis Tagihan</SelectItem>
                <SelectItem value="analisis_skpd">Laporan Analisis SKPD</SelectItem> {/* Changed label and value */}
              </SelectContent>
            </Select>
          </div>
          {(reportType === 'sumber_dana' || reportType === 'jenis_tagihan') && (
            <div className="grid gap-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                <SelectTrigger id="status-filter" className="w-full">
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
                  <SelectTrigger id="group-by-option" className="w-full">
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
                  <SelectTrigger id="skpd-for-analysis" className="w-full">
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
            </>
          )}
          <Button onClick={handleGenerateReport} className="w-full md:col-span-1 lg:col-span-1 flex items-center gap-2" disabled={loadingReport}>
            {loadingReport ? 'Membuat Laporan...' : <><BarChartIcon className="h-4 w-4" /> Tampilkan Laporan</>}
          </Button>
        </CardContent>
      </Card>

      {/* Area Visualisasi Laporan */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Visualisasi Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReport ? (
            <div className="h-80 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
              Memuat grafik...
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
                  innerRadius={60} // Kunci untuk Donut Chart
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
          ) : generatedReportType === 'analisis_skpd' && chartData.length > 0 ? ( // NEW: Bar Chart for analisis_skpd
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} name="Total Nilai" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
              Area Chart / Grafik Akan Muncul Di Sini
            </div>
          )}
        </CardContent>
      </Card>

      {/* Area Tabel Rangkuman */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Tabel Rangkuman</CardTitle>
        </CardHeader>
        <CardContent>
          {/* "Baris per halaman" dropdown */}
          <div className="mb-4 flex justify-end items-center space-x-2">
            <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1); // Reset to first page when items per page changes
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="10" />
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

          {loadingReport ? (
            <div className="h-60 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
              Memuat tabel...
            </div>
          ) : (generatedReportType === 'sumber_dana' || generatedReportType === 'jenis_tagihan') && tableData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{generatedReportType === 'sumber_dana' ? 'Sumber Dana' : 'Jenis Tagihan'}</TableHead>
                    <TableHead className="text-right">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTableData.map((item: ChartDataItem, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : generatedReportType === 'analisis_skpd' && tableData.length > 0 ? ( // NEW: Detail Table for analisis_skpd
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama SKPD</TableHead>
                    <TableHead>Nomor SPM</TableHead>
                    <TableHead>Jenis SPM</TableHead>
                    <TableHead>Jenis Tagihan</TableHead>
                    <TableHead>Sumber Dana</TableHead>
                    <TableHead>Uraian</TableHead>
                    <TableHead className="text-right">Jumlah Kotor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Input</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTableData.map((item: TagihanDetail) => (
                    <TableRow key={item.id_tagihan}>
                      <TableCell>{item.nama_skpd}</TableCell>
                      <TableCell>{item.nomor_spm}</TableCell>
                      <TableCell>{item.jenis_spm}</TableCell>
                      <TableCell>{item.jenis_tagihan}</TableCell>
                      <TableCell>{item.sumber_dana || '-'}</TableCell>
                      <TableCell>{item.uraian}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.jumlah_kotor)}</TableCell>
                      <TableCell>{item.status_tagihan}</TableCell>
                      <TableCell>{new Date(item.waktu_input).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-60 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
              Tabel Rangkuman Akan Muncul Di Sini
            </div>
          )}
          {/* Pagination Controls */}
          {tableData.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              <div className="text-sm text-muted-foreground">
                Halaman {tableData.length === 0 ? 0 : currentPage} dari {totalPages} ({tableData.length} total item)
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || itemsPerPage === -1}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, index) => (
                    <PaginationItem key={index}>
                      <PaginationLink
                        isActive={currentPage === index + 1}
                        onClick={() => setCurrentPage(index + 1)}
                        disabled={itemsPerPage === -1}
                      >
                        {index + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || itemsPerPage === -1}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tombol Download Laporan */}
      <div className="flex justify-end">
        <Button onClick={handleDownloadCSV} variant="outline" className="flex items-center gap-2" disabled={!generatedReportType || loadingReport || tableData.length === 0}>
          <FileDownIcon className="h-4 w-4" /> Download Laporan (CSV)
        </Button>
      </div>
    </div>
  );
};

export default AdminLaporan;