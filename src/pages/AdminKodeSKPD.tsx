import React, { useEffect, useState, useRef } from 'react';
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
import { PlusCircleIcon, EditIcon, Trash2Icon, SearchIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AddSkpdDialog from '@/components/AddSkpdDialog';
import EditSkpdDialog from '@/components/EditSkpdDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import useDebounce from '@/hooks/use-debounce'; // Import useDebounce

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
  const [loadingPagination, setLoadingPagination] = useState(false); // New state for pagination loading
  const [isAddSkpdModalOpen, setIsAddSkpdModalOpen] = useState(false);
  const [isEditSkpdModalOpen, setIsEditSkpdModalOpen] = useState(false);
  const [editingSkpd, setEditingSkpd] = useState<SkpdData | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [skpdToDelete, setSkpdToDelete] = useState<{ id: string; namaSkpd: string } | null>(null);

  // States for search and pagination controls
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search query
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0); // State to store total count of items

  // Refs to track previous values for determining pagination-only changes
  const prevSearchQuery = useRef(searchQuery);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  const fetchSkpdData = async (isPaginationOnlyChange = false) => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingData(true); // Show full loading spinner for search/filter changes
    } else {
      setLoadingPagination(true); // Only disable pagination buttons for page changes
    }

    try {
      let query = supabase
        .from('master_skpd')
        .select('*', { count: 'exact' }); // Include count for pagination

      if (debouncedSearchQuery) {
        query = query.or(
          `nama_skpd.ilike.%${debouncedSearchQuery}%,kode_skpd.ilike.%${debouncedSearchQuery}%`
        );
      }

      query = query.order('nama_skpd', { ascending: true });

      // Apply pagination range
      if (itemsPerPage !== -1) { // Only apply range if not 'All'
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setSkpdList(data as SkpdData[]);
      setTotalItems(count || 0); // Set total items for pagination
    } catch (error: any) {
      console.error('Error fetching SKPD data:', error.message);
      toast.error('Gagal memuat data SKPD: ' + error.message);
    } finally {
      if (!isPaginationOnlyChange) {
        setLoadingData(false);
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
      prevSearchQuery.current === debouncedSearchQuery &&
      prevItemsPerPage.current === itemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchSkpdData(isPaginationOnlyChange);

    // Update refs for the next render cycle
    prevSearchQuery.current = debouncedSearchQuery;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;

  }, [sessionLoading, profile, debouncedSearchQuery, itemsPerPage, currentPage]); // Add pagination states to dependencies

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

  // Calculate total pages for pagination
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
          {/* Search Input and Items Per Page Dropdown */}
          <div className="mb-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 sm:space-x-2">
            <div className="relative flex-1 w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan Nama atau Kode SKPD..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">Baris per halaman:</Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1); // Reset page on items per page change
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="-1">Semua</SelectItem> {/* Option to show all items */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table><TableHeader><TableRow>
                  <TableHead>Nama SKPD</TableHead><TableHead>Kode SKPD</TableHead><TableHead className="text-center">Aksi</TableHead>
                </TableRow></TableHeader><TableBody>
                {loadingData && !loadingPagination ? (
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
                  skpdList.map((skpd, index) => (
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