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
import { FileDownIcon, BarChartIcon } from 'lucide-react';

const AdminLaporan = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportType, setReportType] = useState<string>('');

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const handleGenerateReport = () => {
    // Placeholder for report generation logic
    toast.info('Fungsi generate laporan belum diimplementasikan.');
    console.log('Generate Report clicked with:', { dateRange, reportType });
  };

  const handleDownloadReport = () => {
    // Placeholder for report download logic
    toast.info('Fungsi download laporan belum diimplementasikan.');
    console.log('Download Report clicked with:', { dateRange, reportType });
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
          <Button onClick={handleGenerateReport} className="w-full md:col-span-1 lg:col-span-1 flex items-center gap-2">
            <BarChartIcon className="h-4 w-4" /> Tampilkan Laporan
          </Button>
        </CardContent>
      </Card>

      {/* Area Placeholder untuk Chart */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Visualisasi Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
            Area Chart / Grafik Akan Muncul Di Sini
          </div>
        </CardContent>
      </Card>

      {/* Area Placeholder untuk Tabel Rangkuman */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Tabel Rangkuman</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-md border border-dashed border-gray-300 dark:border-gray-600 text-muted-foreground">
            Tabel Rangkuman Akan Muncul Di Sini
          </div>
        </CardContent>
      </Card>

      {/* Tombol Download Laporan */}
      <div className="flex justify-end">
        <Button onClick={handleDownloadReport} variant="outline" className="flex items-center gap-2">
          <FileDownIcon className="h-4 w-4" /> Download Laporan (CSV)
        </Button>
      </div>
    </div>
  );
};

export default AdminLaporan;