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
import { PlusCircleIcon, EditIcon, Trash2Icon, SearchIcon, BanIcon, CheckCircleIcon, ArrowRightLeftIcon, UsersIcon, ChevronLeftIcon, ChevronRightIcon, FilterIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AddUserDialog from '@/components/AddUserDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { Input } from '@/components/ui/input';
import useDebounce from '@/hooks/use-debounce';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
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
  is_active: boolean;
  last_active?: string; // Add last_active timestamp
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

  // NEW: State for role filter
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('Semua Pengguna');

  // State for Transfer Data Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);
  const prevSelectedRoleFilter = useRef(selectedRoleFilter); // NEW: Ref for role filter

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
        .select('id, nama_lengkap, asal_skpd, peran, email, is_active, last_active', { count: 'exact' });

      if (debouncedSearchQuery) {
        query = query.or(
          `nama_lengkap.ilike.%${debouncedSearchQuery}%,email.ilike.%${debouncedSearchQuery}%`
        );
      }

      // Apply conditional role filter
      if (selectedRoleFilter === 'Administrator') {
        query = query.eq('peran', 'Administrator');
      } else if (selectedRoleFilter === 'Staf') {
        query = query.in('peran', ['Staf Registrasi', 'Staf Verifikator', 'Staf Koreksi']);
      } else if (selectedRoleFilter === 'SKPD (Semua)') {
        query = query.eq('peran', 'SKPD');
      } else if (selectedRoleFilter === 'SKPD (Menunggu Aktivasi)') {
        query = query.eq('peran', 'SKPD').is('asal_skpd', null);
      }
      // If 'Semua Pengguna', no additional role filter is applied

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
        is_active: user.is_active,
        last_active: user.last_active,
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
      prevItemsPerPage.current === itemsPerPage &&
      prevSelectedRoleFilter.current === selectedRoleFilter // NEW: Include role filter ref
    ) {
      isPaginationOnlyChange = true;
    }

    fetchUsers(isPaginationOnlyChange);

    // Update refs for the next render cycle
    prevSearchQuery.current = searchQuery;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;
    prevSelectedRoleFilter.current = selectedRoleFilter; // NEW: Update role filter ref

  }, [sessionLoading, profile, debouncedSearchQuery, currentPage, itemsPerPage, selectedRoleFilter]); // NEW: Add selectedRoleFilter to dependencies

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

  // NEW: handleToggleUserStatus function
  const handleToggleUserStatus = async (userProfile: UserProfile) => {
    try {
      const newStatus = !userProfile.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success(`Pengguna ${userProfile.nama_lengkap || userProfile.email} berhasil ${newStatus ? 'diaktifkan' : 'diblokir'}.`);
      fetchUsers(); // Refresh the list to show updated status
    } catch (error: any) {
      console.error('Error toggling user status:', error.message);
      toast.error('Gagal mengubah status pengguna: ' + error.message);
    }
  };

  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(totalItems / itemsPerPage);

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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <UsersIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                Manajemen Pengguna
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Kelola akun pengguna dalam sistem
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
              size="sm"
            >
              <ArrowRightLeftIcon className="h-4 w-4" /> Transfer Data
            </Button>
            <Button
              onClick={() => { setEditingUser(null); setIsAddUserModalOpen(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <PlusCircleIcon className="h-4 w-4" /> Tambah Pengguna
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Search Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <FilterIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Filter & Pencarian
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                type="text"
                placeholder="Cari Nama atau Email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
              />
            </div>

            {/* Role Filter */}
            <Select onValueChange={(value) => { setSelectedRoleFilter(value); setCurrentPage(1); }} value={selectedRoleFilter}>
              <SelectTrigger className="border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors">
                <SelectValue placeholder="Filter Peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua Pengguna">Semua Pengguna</SelectItem>
                <SelectItem value="Administrator">Administrator</SelectItem>
                <SelectItem value="Staf">Staf</SelectItem>
                <SelectItem value="SKPD (Semua)">SKPD (Semua)</SelectItem>
                <SelectItem value="SKPD (Menunggu Aktivasi)">SKPD (Menunggu Aktivasi)</SelectItem>
              </SelectContent>
            </Select>

            {/* Items per page */}
            <div className="flex items-center gap-2">
              <Label htmlFor="items-per-page" className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Tampilkan:
              </Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px] h-9 border-slate-300 dark:border-slate-700">
                  <SelectValue />
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
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <UsersIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Daftar Pengguna
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Nama Lengkap</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Email</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Asal SKPD</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Peran</TableHead>
                  <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Terakhir Aktif</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700 dark:text-slate-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers && !loadingPagination ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-12 h-12">
                          <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Memuat pengguna...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                          <UsersIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tidak ada pengguna ditemukan</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Coba ubah filter pencarian</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userProfile) => (
                    <TableRow key={userProfile.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="font-semibold text-slate-900 dark:text-white">{userProfile.nama_lengkap || '-'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{userProfile.email}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{userProfile.asal_skpd || '-'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{userProfile.peran || '-'}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {userProfile.last_active
                          ? formatDistanceToNow(parseISO(userProfile.last_active), {
                            addSuffix: true,
                            locale: localeId
                          })
                          : 'Belum pernah aktif'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                                  onClick={() => handleEditClick(userProfile)}
                                >
                                  <EditIcon className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Pengguna</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {userProfile.peran === 'SKPD' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className={`h-8 w-8 transition-colors ${userProfile.is_active
                                      ? 'hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-500 dark:hover:text-red-400'
                                      : 'hover:bg-green-50 hover:border-green-500 hover:text-green-600 dark:hover:bg-green-950 dark:hover:border-green-500 dark:hover:text-green-400'
                                      }`}
                                    onClick={() => handleToggleUserStatus(userProfile)}
                                  >
                                    {userProfile.is_active ? (
                                      <BanIcon className="h-4 w-4" />
                                    ) : (
                                      <CheckCircleIcon className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{userProfile.is_active ? 'Blokir Pengguna' : 'Aktifkan Pengguna'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-red-50 hover:border-red-500 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors"
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
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Menampilkan <span className="text-slate-900 dark:text-white font-semibold">{totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="text-slate-900 dark:text-white font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="text-slate-900 dark:text-white font-semibold">{totalItems}</span> pengguna
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || itemsPerPage === -1 || loadingPagination}
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
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || itemsPerPage === -1 || loadingPagination}
                  className="gap-1.5 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
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