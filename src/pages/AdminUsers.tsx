import React, { useState, useEffect, useRef } from 'react';
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
import { PlusCircleIcon, EditIcon, Trash2Icon, SearchIcon, KeyRoundIcon, ArrowRightLeftIcon } from 'lucide-react'; // Import KeyRoundIcon and ArrowRightLeftIcon
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AddUserDialog from '@/components/AddUserDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { Input } from '@/components/ui/input';
import useDebounce from '@/hooks/use-debounce';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import TransferUserDataDialog from '@/components/TransferUserDataDialog'; // Import the new dialog

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
  const [loadingPagination, setLoadingPagination] = useState(false); // New state for pagination loading
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; namaLengkap: string } | null>(null);

  // State for search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // State for Transfer Data Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const fetchUsers = async (isPaginationOnlyChange = false) => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingUsers(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingUsers(true); // Show full loading spinner for search/filter changes
    } else {
      setLoadingPagination(true); // Only disable pagination buttons for page changes
    }

    try {
      let query = supabase
        .from('user_profiles_with_email')
        .select('id, nama_lengkap, asal_skpd, peran, email', { count: 'exact' });

      if (debouncedSearchQuery) {
        query = query.or(
          `nama_lengkap.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%`
        );
      }

      query = query.order('nama_lengkap', { ascending: true });

      if (itemsPerPage !== -1) { // Apply range only if not 'All'
        query = query.range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const usersWithEmail: UserProfile[] = data.map((user: any) => ({
        id: user.id,
        nama_lengkap: user.nama_lengkap,
        asal_skpd: user.asal_skpd,
        peran: user.peran,
        email: user.email || 'N/A',
      }));

      setUsers(usersWithEmail);
      setTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error fetching users:', error.message);
      toast.error('Gagal memuat daftar pengguna: ' + error.message);
    } finally {
      if (!isPaginationOnlyChange) {
        setLoadingUsers(false);
      } else {
        setLoadingPagination(false);
      }
    }
  };

  useEffect(() => {
    let isPaginationOnlyChange = false;
    // Check if only currentPage changed, while other filters/search/itemsPerPage remained the same
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === searchQuery &&
      prevItemsPerPage.current === itemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchUsers(isPaginationOnlyChange);

    // Update refs for the next render cycle
    prevSearchQuery.current = searchQuery;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;

  }, [sessionLoading, profile, debouncedSearchQuery, currentPage, itemsPerPage]);

  const handleUserAddedOrUpdated = () => {
    fetchUsers(); // Refresh the user list after a new user is added or updated
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setIsAddUserModalOpen(true);
  };

  const handleCloseAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setEditingUser(null);
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
      const { data, error: invokeError } = await supabase.functions.invoke('delete-user', {
        body: JSON.stringify({ user_id: userToDelete.id }),
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      toast.success(`Pengguna ${userToDelete.namaLengkap} berhasil dihapus.`);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error.message);
      toast.error('Gagal menghapus pengguna: ' + error.message);
    }
  };

  const handleSendResetPassword = async (userProfile: UserProfile) => {
    if (!userProfile.email || userProfile.email === 'N/A') {
      toast.error('Email pengguna tidak tersedia untuk reset password.');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${window.location.origin}/login`, // Redirect to login after reset
      });

      if (error) {
        throw error;
      }

      toast.success(`Link reset password telah dikirim ke ${userProfile.email}.`);
    } catch (error: any) {
      console.error('Error sending reset password link:', error.message);
      toast.error('Gagal mengirim link reset password: ' + error.message);
    }
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

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
        <div className="flex space-x-2"> {/* Container for multiple buttons */}
          <Button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2" variant="outline">
            <ArrowRightLeftIcon className="h-4 w-4" /> Transfer Data Pengguna
          </Button>
          <Button onClick={() => { setEditingUser(null); setIsAddUserModalOpen(true); }} className="flex items-center gap-2">
            <PlusCircleIcon className="h-4 w-4" /> Tambah Pengguna Baru
          </Button>
        </div>
      </div>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1 w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan Nama atau Email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pl-9 w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
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
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="-1">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow>
                  <TableHead>Nama Lengkap</TableHead><TableHead>Email</TableHead><TableHead>Asal SKPD</TableHead><TableHead>Peran</TableHead><TableHead className="text-center">Aksi</TableHead>
                </TableRow></TableHeader><TableBody>
                {loadingUsers && !loadingPagination ? (
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
                      <TableCell className="font-medium">{userProfile.nama_lengkap || '-'}</TableCell><TableCell>{userProfile.email}</TableCell><TableCell>{userProfile.asal_skpd || '-'}</TableCell><TableCell>{userProfile.peran || '-'}</TableCell><TableCell className="text-center">
                        <div className="flex justify-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleEditClick(userProfile)}>
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Pengguna</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleSendResetPassword(userProfile)}>
                                  <KeyRoundIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Kirim Link Reset Password</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteClick(userProfile)}
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Hapus Pengguna</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody></Table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-6 flex items-center justify-end space-x-4">
            <div className="text-sm text-muted-foreground">
              Halaman {totalItems === 0 ? 0 : currentPage} dari {totalPages} ({totalItems} total item)
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || itemsPerPage === -1 || loadingPagination}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || itemsPerPage === -1 || loadingPagination}
            >
              Berikutnya
            </Button>
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

      <TransferUserDataDialog
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransferSuccess={fetchUsers} // Pass fetchUsers to refresh the list
      />
    </div>
  );
};

export default AdminUsers;