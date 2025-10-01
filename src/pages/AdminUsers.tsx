import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AddUserDialog from '@/components/AddUserDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog'; // Import the delete confirmation dialog

interface UserProfile {
  id: string;
  nama_lengkap: string;
  asal_skpd: string;
  peran: string;
  email: string;
}

const AdminUsers = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); // State for delete confirmation dialog
  const [userToDelete, setUserToDelete] = useState<{ id: string; namaLengkap: string } | null>(null); // State for user to delete

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const fetchUsers = async () => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles_with_email')
        .select('id, nama_lengkap, asal_skpd, peran, email');

      if (error) throw error;

      const usersWithEmail: UserProfile[] = data.map((user: any) => ({
        id: user.id,
        nama_lengkap: user.nama_lengkap,
        asal_skpd: user.asal_skpd,
        peran: user.peran,
        email: user.email || 'N/A',
      }));

      setUsers(usersWithEmail);
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
      toast.error('Gagal memuat daftar pengguna: ' + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [sessionLoading, profile]);

  const handleUserAddedOrUpdated = () => {
    fetchUsers(); // Refresh the user list after a new user is added or updated
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user); // Set the user to be edited
    setIsAddUserModalOpen(true); // Open the modal
  };

  const handleCloseAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setEditingUser(null); // Reset editingUser when modal closes
  };

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete({ id: user.id, namaLengkap: user.nama_lengkap || user.email });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) {
      toast.error('Tidak ada pengguna yang dipilih untuk dihapus.');
      return;
    }

    try {
      // Delete user from Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.id);

      if (authError) {
        throw authError;
      }

      // Note: The profile in the 'profiles' table will be automatically deleted
      // due to the 'ON DELETE CASCADE' constraint on the 'id' column.
      // The 'user_profiles_with_email' view will also reflect this change.

      toast.success(`Pengguna ${userToDelete.namaLengkap} berhasil dihapus.`);
      // Umpan balik visual (menutup modal, refresh tabel) akan ditangani di Tahap 3
    } catch (error: any) {
      console.error('Error deleting user:', error.message);
      toast.error('Gagal menghapus pengguna: ' + error.message);
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
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Manajemen Pengguna</h1>
        <Button onClick={() => { setEditingUser(null); setIsAddUserModalOpen(true); }} className="flex items-center gap-2">
          <PlusCircleIcon className="h-4 w-4" /> Tambah Pengguna Baru
        </Button>
      </div>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Asal SKPD</TableHead>
                  <TableHead>Peran</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Memuat pengguna...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Tidak ada pengguna ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userProfile) => (
                    <TableRow key={userProfile.id}>
                      <TableCell className="font-medium">{userProfile.nama_lengkap || '-'}</TableCell>
                      <TableCell>{userProfile.email}</TableCell>
                      <TableCell>{userProfile.asal_skpd || '-'}</TableCell>
                      <TableCell>{userProfile.peran || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="icon" title="Edit Pengguna" onClick={() => handleEditClick(userProfile)}>
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            title="Hapus Pengguna"
                            onClick={() => handleDeleteClick(userProfile)}
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

      <AddUserDialog
        isOpen={isAddUserModalOpen}
        onClose={handleCloseAddUserModal}
        onUserAdded={handleUserAddedOrUpdated}
        editingUser={editingUser}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan"
        message={`Apakah Anda yakin ingin menghapus pengguna ${userToDelete?.namaLengkap || ''}? Tindakan ini tidak dapat diurungkan.`}
      />
    </div>
  );
};

export default AdminUsers;