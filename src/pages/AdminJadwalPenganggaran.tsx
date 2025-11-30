import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircleIcon, EditIcon, Trash2Icon, CheckCircleIcon, CalendarClockIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AddScheduleDialog from '@/components/AddScheduleDialog';
import EditScheduleDialog from '@/components/EditScheduleDialog'; // Import the new dialog component
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'; // Import the delete confirmation dialog

interface ScheduleData {
  id: string;
  kode_jadwal: string;
  deskripsi_jadwal: string;
  created_at: string; // Assuming created_at is automatically added by Supabase
  is_active?: boolean; // Add is_active to the interface
}

const AdminJadwalPenganggaran = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [scheduleList, setScheduleList] = useState<ScheduleData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false); // State for add dialog
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false); // State for edit dialog
  const [editingSchedule, setEditingSchedule] = useState<ScheduleData | null>(null); // State for schedule being edited

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete dialog
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: string; kodeJadwal: string } | null>(null); // State for schedule to delete

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const fetchScheduleData = async () => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('master_jadwal')
        .select('*')
        .order('kode_jadwal', { ascending: true });

      if (error) throw error;
      setScheduleList(data as ScheduleData[]);
    } catch (error: any) {
      console.error('Error fetching schedule data:', error.message);
      toast.error('Gagal memuat data jadwal penganggaran: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, [sessionLoading, profile]);

  const handleScheduleAddedOrUpdated = () => {
    fetchScheduleData(); // Refresh the list after a new schedule is added or updated
  };

  const handleEditClick = (schedule: ScheduleData) => {
    setEditingSchedule(schedule);
    setIsEditScheduleModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditScheduleModalOpen(false);
    setEditingSchedule(null);
  };

  const handleDeleteClick = (schedule: ScheduleData) => {
    setScheduleToDelete({ id: schedule.id, kodeJadwal: schedule.kode_jadwal });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) {
      toast.error('Tidak ada jadwal yang dipilih untuk dihapus.');
      return;
    }

    try {
      const { error } = await supabase
        .from('master_jadwal')
        .delete()
        .eq('id', scheduleToDelete.id);

      if (error) throw error;

      toast.success(`Jadwal dengan Kode "${scheduleToDelete.kodeJadwal}" berhasil dihapus.`);
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
      fetchScheduleData(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting schedule:', error.message);
      toast.error('Gagal menghapus jadwal: ' + error.message);
    }
  };

  const handleActivateSchedule = async (scheduleId: string) => {
    try {
      // Deactivate all other schedules
      const { error: deactivateError } = await supabase
        .from('master_jadwal')
        .update({ is_active: false })
        .neq('id', scheduleId); // Exclude the current schedule from deactivation

      if (deactivateError) throw deactivateError;

      // Activate the selected schedule
      const { error: activateError } = await supabase
        .from('master_jadwal')
        .update({ is_active: true })
        .eq('id', scheduleId);

      if (activateError) throw activateError;

      toast.success('Jadwal berhasil diaktifkan!');
      fetchScheduleData(); // Refresh the list to show updated status
    } catch (error: any) {
      console.error('Error activating schedule:', error.message);
      toast.error('Gagal mengaktifkan jadwal: ' + error.message);
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <CalendarClockIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Jadwal Penganggaran
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola periode dan status jadwal penganggaran
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsAddScheduleModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <PlusCircleIcon className="h-4 w-4" /> Tambah Jadwal
        </Button>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <CalendarClockIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Daftar Jadwal
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950">
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Kode Jadwal</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Deskripsi Jadwal</TableHead>
                  <TableHead className="text-center font-bold text-emerald-900 dark:text-emerald-100">Status</TableHead>
                  <TableHead className="text-center font-bold text-emerald-900 dark:text-emerald-100">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Memuat data jadwal...
                    </TableCell>
                  </TableRow>
                ) : scheduleList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Tidak ada data jadwal ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  scheduleList.map((schedule) => (
                    <TableRow key={schedule.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors">
                      <TableCell className="font-medium">{schedule.kode_jadwal}</TableCell>
                      <TableCell>{schedule.deskripsi_jadwal}</TableCell>
                      <TableCell className="text-center">
                        {schedule.is_active ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" /> Aktif
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateSchedule(schedule.id)}
                            className="h-7 text-xs hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500 dark:hover:bg-emerald-950 transition-colors"
                          >
                            Aktifkan
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Edit Jadwal"
                            onClick={() => handleEditClick(schedule)}
                            className="hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Hapus Jadwal"
                            onClick={() => handleDeleteClick(schedule)}
                            className="hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddScheduleDialog
        isOpen={isAddScheduleModalOpen}
        onClose={() => setIsAddScheduleModalOpen(false)}
        onScheduleAdded={handleScheduleAddedOrUpdated}
      />

      <EditScheduleDialog
        isOpen={isEditScheduleModalOpen}
        onClose={handleCloseEditModal}
        onScheduleUpdated={handleScheduleAddedOrUpdated}
        editingSchedule={editingSchedule}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan Jadwal"
        message={`Apakah Anda yakin ingin menghapus jadwal dengan Kode "${scheduleToDelete?.kodeJadwal || ''}"? Tindakan ini tidak dapat diurungkan.`}
      />
    </div>
  );
};

export default AdminJadwalPenganggaran;