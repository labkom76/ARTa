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
import { PlusCircleIcon, EditIcon, Trash2Icon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AddSkpdDialog from '@/components/AddSkpdDialog';
import EditSkpdDialog from '@/components/EditSkpdDialog'; // Import the new dialog component
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'; // Import the delete confirmation dialog

interface SkpdData {
  id: string;
  nama_skpd: string;
  kode_skpd: string;
  created_at: string;
}

const AdminKodeSKPD = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [skpdList, setSkpdList] = useState<SkpdData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isAddSkpdModalOpen, setIsAddSkpdModalOpen] = useState(false);
  const [isEditSkpdModalOpen, setIsEditSkpdModalOpen] = useState(false); // State for edit dialog
  const [editingSkpd, setEditingSkpd] = useState<SkpdData | null>(null); // State for SKPD being edited

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete dialog
  const [skpdToDelete, setSkpdToDelete] = useState<{ id: string; namaSkpd: string } | null>(null); // State for SKPD to delete

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const fetchSkpdData = async () => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('master_skpd')
        .select('*')
        .order('nama_skpd', { ascending: true });

      if (error) throw error;
      setSkpdList(data as SkpdData[]);
    } catch (error: any) {
      console.error('Error fetching SKPD data:', error.message);
      toast.error('Gagal memuat data SKPD: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSkpdData();
  }, [sessionLoading, profile]);

  const handleSkpdAddedOrUpdated = () => {
    fetchSkpdData(); // Refresh the list after a new SKPD is added or updated
  };

  const handleEditClick = (skpd: SkpdData) => {
    setEditingSkpd(skpd);
    setIsEditSkpdModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditSkpdModalOpen(false);
    setEditingSkpd(null);
  };

  const handleDeleteClick = (skpd: SkpdData) => {
    setSkpdToDelete({ id: skpd.id, namaSkpd: skpd.nama_skpd });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!skpdToDelete) {
      toast.error('Tidak ada SKPD yang dipilih untuk dihapus.');
      return;
    }

    try {
      const { error } = await supabase
        .from('master_skpd')
        .delete()
        .eq('id', skpdToDelete.id);

      if (error) throw error;

      toast.success(`SKPD "${skpdToDelete.namaSkpd}" berhasil dihapus.`);
      setIsDeleteDialogOpen(false);
      setSkpdToDelete(null);
      fetchSkpdData(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting SKPD:', error.message);
      toast.error('Gagal menghapus SKPD: ' + error.message);
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Kode SKPD</h1>
        <Button onClick={() => setIsAddSkpdModalOpen(true)} className="flex items-center gap-2">
          <PlusCircleIcon className="h-4 w-4" /> Tambah SKPD Baru
        </Button>
      </div>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Kode SKPD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow>
                  <TableHead>Nama SKPD</TableHead><TableHead>Kode SKPD</TableHead><TableHead className="text-center">Aksi</TableHead>
                </TableRow></TableHeader><TableBody>
                {loadingData ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Memuat data SKPD...
                    </TableCell>
                  </TableRow>
                ) : skpdList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Tidak ada data SKPD ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  skpdList.map((skpd) => (
                    <TableRow key={skpd.id}>
                      <TableCell className="font-medium">{skpd.nama_skpd}</TableCell><TableCell>{skpd.kode_skpd}</TableCell><TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="icon" title="Edit SKPD" onClick={() => handleEditClick(skpd)}>
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" title="Hapus SKPD" onClick={() => handleDeleteClick(skpd)}>
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody></Table>
          </div>
        </CardContent>
      </Card>

      <AddSkpdDialog
        isOpen={isAddSkpdModalOpen}
        onClose={() => setIsAddSkpdModalOpen(false)}
        onSkpdAdded={handleSkpdAddedOrUpdated}
      />

      <EditSkpdDialog
        isOpen={isEditSkpdModalOpen}
        onClose={handleCloseEditModal}
        onSkpdUpdated={handleSkpdAddedOrUpdated}
        editingSkpd={editingSkpd}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan SKPD"
        message={`Apakah Anda yakin ingin menghapus SKPD "${skpdToDelete?.namaSkpd || ''}"? Tindakan ini tidak dapat diurungkan.`}
      />
    </div>
  );
};

export default AdminKodeSKPD;