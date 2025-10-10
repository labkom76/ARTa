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
import { PlusCircleIcon, EditIcon, Trash2Icon, CheckCircleIcon } from 'lucide-react';
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Jadwal Penganggaran</h1>
        <Button onClick={() => setIsAddScheduleModalOpen(true)} className="flex items-center gap-2">
          <PlusCircleIcon className="h-4 w-4" /> Tambah Jadwal Baru
        </Button>
      </div>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Jadwal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode Jadwal</TableHead>
                  <TableHead>Deskripsi Jadwal</TableHead>
                  <TableHead className="text-center">Status</TableHead> {/* New TableHead */}
                  <TableHead className="text-center">Aksi</TableHead>
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
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.kode_jadwal}</TableCell>
                      <TableCell>{schedule.deskripsi_jadwal}</TableCell>
                      <TableCell className="text-center">
                        {schedule.is_active ? (
                          <Button variant="success" size="sm" disabled className="bg-green-500 text-white hover:bg-green-600">
                            <CheckCircleIcon className="h-4 w-4 mr-2" /> Aktif
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleActivateSchedule(schedule.id)}>
                            Aktifkan
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="icon" title="Edit Jadwal" onClick={() => handleEditClick(schedule)}>
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" title="Hapus Jadwal" onClick={() => handleDeleteClick(schedule)}>
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