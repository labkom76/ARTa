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
import { EyeIcon, HistoryIcon } from 'lucide-react';
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
  'USER_DELETED', // Example action
  'SKPD_ADDED',
  'SKPD_UPDATED',
  'SKPD_DELETED',
  'SCHEDULE_ADDED',
  'SCHEDULE_UPDATED',
  'SCHEDULE_DELETED',
  'SCHEDULE_ACTIVATED',
  'APP_SETTING_UPDATED',
];

// NEW: Options for role filter
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

  // State for date range filter
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  // State for action type filter
  const [selectedAction, setSelectedAction] = useState<string>('Semua Aksi');
  // NEW: State for role filter
  const [selectedRole, setSelectedRole] = useState<string>('Semua Peran');

  // Handler for date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
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
        .select('*, profiles(nama_lengkap, asal_skpd)')
        .order('created_at', { ascending: false })
        .limit(50);

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

      // NEW: Apply role filter
      if (selectedRole !== 'Semua Peran') {
        query = query.eq('user_role', selectedRole);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogData(data as ActivityLogItem[]);
    } catch (error: any) {
      console.error('Error fetching activity logs:', error.message);
      toast.error('Gagal memuat log aktivitas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [sessionLoading, profile, dateRange, selectedAction, selectedRole]); // NEW: Add selectedRole to dependencies

  const handleViewDetails = (details: Record<string, any> | null) => {
    setSelectedLogDetails(details);
    setIsDetailModalOpen(true);
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda dan mengambil data.</p>
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Log Aktivitas Sistem</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Melihat riwayat aktivitas penting yang terjadi di sistem.
      </p>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Filter Log Aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="grid gap-2 flex-1 w-full sm:w-auto">
              <Label htmlFor="date-range">Rentang Tanggal</Label>
              <DateRangePickerWithPresets
                date={dateRange}
                onDateChange={handleDateRangeChange}
                className="w-full"
              />
            </div>
            {/* Action Type Filter */}
            <div className="grid gap-2 flex-1 w-full sm:w-auto">
              <Label htmlFor="action-type">Jenis Aksi</Label>
              <Select onValueChange={setSelectedAction} value={selectedAction}>
                <SelectTrigger id="action-type" className="w-full">
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
            {/* NEW: Role Filter */}
            <div className="grid gap-2 flex-1 w-full sm:w-auto">
              <Label htmlFor="role-filter">Peran Pengguna</Label>
              <Select onValueChange={setSelectedRole} value={selectedRole}>
                <SelectTrigger id="role-filter" className="w-full">
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

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Log Aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Waktu</TableHead>
                  <TableHead className="w-[250px]">Pengguna</TableHead>
                  <TableHead className="w-[180px]">Aksi</TableHead>
                  <TableHead className="w-[200px]">Tagihan Terkait</TableHead>
                  <TableHead className="text-center">Detail Perubahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Tidak ada log aktivitas ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  logData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: localeId })}</TableCell>
                      <TableCell>
                        {log.profiles?.nama_lengkap ? (
                          <>
                            <p className="font-medium">{log.profiles.nama_lengkap}</p>
                            <Badge variant="secondary" className="mt-1">{log.user_role || '-'}</Badge>
                            {log.user_role === 'SKPD' && log.profiles.asal_skpd && (
                              <p className="text-xs text-muted-foreground mt-1">{log.profiles.asal_skpd}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">User ID: {log.user_id || 'Tidak Ditemukan'}</p>
                        )}
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="font-mono text-xs">{log.tagihan_terkait || '-'}</TableCell>
                      <TableCell className="text-center">
                        {log.details ? (
                          <Button variant="outline" size="icon" onClick={() => handleViewDetails(log.details)}>
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Log Aktivitas</DialogTitle>
            <DialogDescription>
              Detail perubahan dalam format JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto rounded-md bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono">
            <pre className="whitespace-pre-wrap break-all">
              {selectedLogDetails ? JSON.stringify(selectedLogDetails, null, 2) : 'Tidak ada detail.'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminActivityLog;