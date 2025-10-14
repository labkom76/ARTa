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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666', '#66CCFF'];

const AdminLaporan = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportType, setReportType] = useState<string>('');
  const [generatedReportType, setGeneratedReportType] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false); // New loading state for report generation

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast.error('Pilih jenis laporan terlebih dahulu.');
      return;
    }

    setLoadingReport(true);
    setGeneratedReportType(null); // Clear previous report type
    setReportData([]); // Clear previous data

    try {
      const startDateISO = dateRange?.from ? dateRange.from.toISOString() : undefined;
      const endDateISO = dateRange?.to ? dateRange.to.toISOString() : undefined;

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: JSON.stringify({
          reportType,
          startDate: startDateISO,
          endDate: endDateISO,
        }),
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      setReportData(data || []);
      setGeneratedReportType(reportType); // Set generated report type only on success
      toast.success('Laporan berhasil dibuat!');
    } catch (error: any) {
      console.error('Error generating report:', error.message);
      toast.error('Gagal membuat laporan: ' + error.message);
      setReportData([]);
      setGeneratedReportType(null);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleDownloadReport = () => {
    // Placeholder for report download logic
    toast.info('Fungsi download laporan belum diimplementasikan.');
    console.log('Download Report clicked with:', { dateRange, reportType });
  };

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

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
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
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
                <SelectItem value="detail_skpd">Laporan Detail per SKPD</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          ) : generatedReportType === 'sumber_dana' && reportData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reportData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : generatedReportType === 'jenis_tagihan' && reportData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData}>
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} formatter={(value: number) => formatCurrency(value)} />
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
          {loadingReport ? (
            <div className="h-60 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
              Memuat tabel...
            </div>
          ) : generatedReportType === 'sumber_dana' && reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sumber Dana</TableHead>
                    <TableHead className="text-right">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: ChartDataItem, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : generatedReportType === 'jenis_tagihan' && reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Tagihan</TableHead>
                    <TableHead className="text-right">Total Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: ChartDataItem, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : generatedReportType === 'detail_skpd' && reportData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama SKPD</TableHead>
                    <TableHead>Nomor SPM</TableHead>
                    <TableHead>Jenis SPM</TableHead>
                    <TableHead>Jenis Tagihan</TableHead>
                    <TableHead>Uraian</TableHead>
                    <TableHead className="text-right">Jumlah Kotor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Input</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((item: TagihanDetail, index) => (
                    <TableRow key={item.id_tagihan}>
                      <TableCell>{item.nama_skpd}</TableCell>
                      <TableCell>{item.nomor_spm}</TableCell>
                      <TableCell>{item.jenis_spm}</TableCell>
                      <TableCell>{item.jenis_tagihan}</TableCell>
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
        </CardContent>
      </Card>

      {/* Tombol Download Laporan */}
      <div className="flex justify-end">
        <Button onClick={handleDownloadReport} variant="outline" className="flex items-center gap-2" disabled={!generatedReportType || loadingReport}>
          <FileDownIcon className="h-4 w-4" /> Download Laporan (CSV)
        </Button>
      </div>
    </div>
  );
};

export default AdminLaporan;