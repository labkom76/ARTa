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
import { format } from 'date-fns';
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

interface ActivityLogItem {
  id: string;
  created_at: string;
  user_id: string | null;
  user_role: string | null;
  action: string;
  details: Record<string, any> | null; // JSONB type
  tagihan_terkait: string | null;
}

const AdminActivityLog = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [logData, setLogData] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<Record<string, any> | null>(null);

  const fetchLogs = async () => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 most recent logs

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
  }, [sessionLoading, profile]);

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
          <CardTitle className="text-xl font-semibold">Daftar Log Aktivitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Waktu</TableHead>
                  <TableHead className="w-[150px]">Peran User</TableHead>
                  <TableHead className="w-[200px]">User ID</TableHead>
                  <TableHead className="w-[180px]">Aksi</TableHead>
                  <TableHead className="w-[200px]">Tagihan Terkait</TableHead>
                  <TableHead className="text-center">Detail Perubahan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Tidak ada log aktivitas ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  logData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), 'dd MMM yyyy HH:mm:ss', { locale: localeId })}</TableCell>
                      <TableCell>{log.user_role || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.user_id || '-'}</TableCell>
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