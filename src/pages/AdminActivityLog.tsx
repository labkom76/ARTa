import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { EyeIcon, HistoryIcon, FilterIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DateRangePickerWithPresets } from '@/components/DateRangePickerWithPresets';
import { DateRange } from 'react-day-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ActivityLogItem {
  id: string;
  created_at: string;
  user_id: string | null;
  user_role: string | null;
  action: string;
  details: Record<string, any> | null;
  tagihan_terkait: string | null;
  profiles: {
    nama_lengkap: string | null;
    asal_skpd: string | null;
  } | null;
}

const actionOptions = [
  'Semua Aksi',
  'TAGIHAN_CREATED',
  'STATUS_CHANGED',
  'PROFILE_UPDATED',
  'USER_DELETED',
  'SKPD_ADDED',
  'SKPD_UPDATED',
  'SKPD_DELETED',
  'SCHEDULE_ADDED',
  'SCHEDULE_UPDATED',
  'SCHEDULE_DELETED',
  'SCHEDULE_ACTIVATED',
  'APP_SETTING_UPDATED',
];

const roleOptions = [
  'Semua Peran',
  'Administrator',
  'SKPD',
  'Staf Registrasi',
  'Staf Verifikator',
  'Staf Koreksi',
];

const AdminActivityLog = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [logData, setLogData] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<Record<string, any> | null>(null);

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedAction, setSelectedAction] = useState<string>('Semua Aksi');
  const [selectedRole, setSelectedRole] = useState<string>('Semua Peran');

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Handlers for filters
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  // Handlers for pagination
  const goToNextPage = () => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const fetchLogs = async () => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('activity_log')
        .select('*, profiles(nama_lengkap, asal_skpd)', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply date range filter
      if (dateRange?.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
      }

      // Apply action type filter
      if (selectedAction !== 'Semua Aksi') {
        query = query.eq('action', selectedAction);
      }

      // Apply role filter
      if (selectedRole !== 'Semua Peran') {
        query = query.eq('user_role', selectedRole);
      }

      // Apply pagination range
      if (itemsPerPage !== -1) {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setLogData(data as ActivityLogItem[]);
      setTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error.message);
      toast.error('Gagal memuat log aktivitas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [sessionLoading, profile, dateRange, selectedAction, selectedRole, currentPage, itemsPerPage]);

  const handleViewDetails = (details: Record<string, any> | null) => {
    setSelectedLogDetails(details);
    setIsDetailModalOpen(true);
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

  if (sessionLoading || isLoading) {
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
              Sedang memeriksa hak akses dan mengambil data...
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
            <HistoryIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Log Aktivitas Sistem
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Melihat riwayat aktivitas penting yang terjadi di sistem
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
              Filter Log Aktivitas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="date-range">Rentang Tanggal</Label>
              <DateRangePickerWithPresets
                date={dateRange}
                onDateChange={handleDateRangeChange}
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="action-type">Jenis Aksi</Label>
              <Select onValueChange={(value) => { setSelectedAction(value); setCurrentPage(1); }} value={selectedAction}>
                <SelectTrigger id="action-type" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                  <SelectValue placeholder="Pilih Jenis Aksi" />
                </SelectTrigger>
                <SelectContent>
                  {actionOptions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-filter">Peran Pengguna</Label>
              <Select onValueChange={(value) => { setSelectedRole(value); setCurrentPage(1); }} value={selectedRole}>
                <SelectTrigger id="role-filter" className="w-full border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                  <SelectValue placeholder="Pilih Peran" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <HistoryIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Daftar Log Aktivitas
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
              onValueChange={handleItemsPerPageChange}
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
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                  <TableHead className="w-[180px] font-bold text-emerald-900 dark:text-emerald-100">Waktu</TableHead>
                  <TableHead className="w-[250px] font-bold text-emerald-900 dark:text-emerald-100">Pengguna</TableHead>
                  <TableHead className="w-[180px] font-bold text-emerald-900 dark:text-emerald-100">Aksi</TableHead>
                  <TableHead className="w-[200px] font-bold text-emerald-900 dark:text-emerald-100">Tagihan Terkait</TableHead>
                  <TableHead className="text-center font-bold text-emerald-900 dark:text-emerald-100">Detail Perubahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                          <HistoryIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tidak ada log aktivitas</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Coba ubah filter pencarian</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logData.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: localeId })}
                      </TableCell>
                      <TableCell>
                        {log.profiles?.nama_lengkap ? (
                          <>
                            <p className="font-semibold text-slate-900 dark:text-white">{log.profiles.nama_lengkap}</p>
                            <Badge variant="secondary" className="mt-1">{log.user_role || '-'}</Badge>
                            {log.user_role === 'SKPD' && log.profiles.asal_skpd && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{log.profiles.asal_skpd}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">User ID: {log.user_id || 'Tidak Ditemukan'}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{log.action}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300">{log.tagihan_terkait || '-'}</TableCell>
                      <TableCell className="text-center">
                        {log.details ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewDetails(log.details)}
                            className="h-8 w-8 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {logData.length > 0 && (
            <div className="px-6 py-4 mt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Menampilkan <span className="text-slate-900 dark:text-white font-semibold">{totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-900 dark:text-white font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="text-slate-900 dark:text-white font-semibold">{totalItems}</span> log
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
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
                    onClick={goToNextPage}
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

      {/* Detail Dialog */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Detail Log Aktivitas
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Detail perubahan dalam format JSON
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm font-mono border border-slate-200 dark:border-slate-800">
            <pre className="whitespace-pre-wrap break-all text-slate-700 dark:text-slate-300">
              {selectedLogDetails ? JSON.stringify(selectedLogDetails, null, 2) : 'Tidak ada detail.'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActivityLog;