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
import { PlusCircleIcon, EditIcon, Trash2Icon, SearchIcon, UploadIcon, FileDownIcon, BuildingIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
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
import useDebounce from '@/hooks/use-debounce';
import Papa from 'papaparse'; // Import Papa Parse
import { Combobox } from '@/components/ui/combobox'; // Import Combobox

interface SkpdData {
  id: string;
  nama_skpd: string;
  kode_skpd: string;
  created_at: string;
  kode_skpd_penagihan?: string | null; // NEW: Add kode_skpd_penagihan
}

const AdminKodeSKPD = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [skpdList, setSkpdList] = useState<SkpdData[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [isAddSkpdModalOpen, setIsAddSkpdModalOpen] = useState(false);
  const [isEditSkpdModalOpen, setIsEditSkpdModalOpen] = useState(false);
  const [editingSkpd, setEditingSkpd] = useState<SkpdData | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [skpdToDelete, setSkpdToDelete] = useState<{ id: string; namaSkpd: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const prevSearchQuery = useRef(searchQuery);
  const prevItemsPerPage = useRef(itemsPerPage);
  const prevCurrentPage = useRef(currentPage);

  // New states and ref for CSV upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: State for SKPD options for the 'Kode SKPD Penagihan' combobox
  const [skpdOptionsForPenagihan, setSkpdOptionsForPenagihan] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  // NEW: Fetch SKPD options for the 'Kode SKPD Penagihan' combobox
  useEffect(() => {
    const fetchSkpdOptionsForPenagihan = async () => {
      try {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('kode_skpd, nama_skpd')
          .order('nama_skpd', { ascending: true });

        if (error) throw error;

        const options = (data || []).map(item => ({
          value: item.kode_skpd,
          label: `${item.nama_skpd} (${item.kode_skpd})`,
        }));
        setSkpdOptionsForPenagihan(options);
      } catch (error: any) {
        console.error('Error fetching SKPD options for penagihan:', error.message);
        toast.error('Gagal memuat daftar SKPD untuk penagihan: ' + error.message);
      }
    };
    fetchSkpdOptionsForPenagihan();
  }, []);

  const fetchSkpdData = async (isPaginationOnlyChange = false) => {
    if (sessionLoading || profile?.peran !== 'Administrator') {
      setLoadingData(false);
      return;
    }

    if (!isPaginationOnlyChange) {
      setLoadingData(true);
    } else {
      setLoadingPagination(true);
    }

    try {
      let query = supabase
        .from('master_skpd')
        .select('*, kode_skpd_penagihan', { count: 'exact' }); // NEW: Select kode_skpd_penagihan

      if (debouncedSearchQuery) {
        query = query.or(
          `nama_skpd.ilike.%${debouncedSearchQuery}%,kode_skpd.ilike.%${debouncedSearchQuery}%`
        );
      }

      // MODIFIKASI: Urutkan berdasarkan kode_skpd secara ascending
      query = query.order('kode_skpd', { ascending: true });

      if (itemsPerPage !== -1) {
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setSkpdList(data as SkpdData[]);
      setTotalItems(count || 0);
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
    if (
      prevCurrentPage.current !== currentPage &&
      prevSearchQuery.current === debouncedSearchQuery &&
      prevItemsPerPage.current === itemsPerPage
    ) {
      isPaginationOnlyChange = true;
    }

    fetchSkpdData(isPaginationOnlyChange);

    prevSearchQuery.current = debouncedSearchQuery;
    prevItemsPerPage.current = itemsPerPage;
    prevCurrentPage.current = currentPage;

  }, [sessionLoading, profile, debouncedSearchQuery, itemsPerPage, currentPage]);

  const handleSkpdAddedOrUpdated = () => {
    fetchSkpdData();
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
      fetchSkpdData();
    } catch (error: any) {
      console.error('Error deleting SKPD:', error.message);
      toast.error('Gagal menghapus SKPD: ' + error.message);
    }
  };

  const handleDownloadSkpdCSV = async () => {
    try {
      const { data, error } = await supabase
        .from('master_skpd')
        .select('nama_skpd, kode_skpd, kode_skpd_penagihan') // NEW: Include kode_skpd_penagihan
        .order('kode_skpd', { ascending: true }); // Ensure download is also sorted by kode_skpd

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('Tidak ada data SKPD untuk diunduh.');
        return;
      }

      const csv = Papa.unparse(data, {
        header: true,
        columns: ['nama_skpd', 'kode_skpd', 'kode_skpd_penagihan'], // NEW: Include kode_skpd_penagihan
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'daftar_kode_skpd.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Daftar Kode SKPD berhasil diunduh!');
    } catch (error: any) {
      console.error('Error downloading SKPD CSV:', error.message);
      toast.error('Gagal mengunduh daftar Kode SKPD: ' + error.message);
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast.error('Pilih file CSV untuk diunggah.');
      return;
    }

    const file = event.target.files[0];
    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast.error('Gagal mengurai file CSV. Periksa format file.');
          setIsUploading(false);
          return;
        }

        const parsedData = results.data as { nama_skpd?: string; kode_skpd?: string; kode_skpd_penagihan?: string }[]; // NEW: Include kode_skpd_penagihan

        if (!parsedData || parsedData.length === 0) {
          toast.error('File CSV kosong atau tidak memiliki data yang valid.');
          setIsUploading(false);
          return;
        }

        const validSkpdData = parsedData.filter(row => row.nama_skpd && row.kode_skpd);
        if (validSkpdData.length !== parsedData.length) {
          toast.warning('Beberapa baris di file CSV diabaikan karena data tidak lengkap (nama_skpd atau kode_skpd kosong).');
        }
        if (validSkpdData.length === 0) {
          toast.error('Tidak ada data SKPD yang valid ditemukan di file CSV.');
          setIsUploading(false);
          return;
        }

        try {
          const { data, error: invokeError } = await supabase.functions.invoke('bulk-upsert-skpd', {
            body: JSON.stringify({ skpdData: validSkpdData }),
          });

          if (invokeError) throw invokeError;
          if (data && data.error) throw new Error(data.error);

          toast.success('Data SKPD berhasil diimpor/diperbarui!');
          fetchSkpdData();
        } catch (error: any) {
          console.error('Error importing SKPD data:', error.message);
          toast.error('Gagal mengimpor data SKPD: ' + error.message);
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error: any) => {
        console.error('Papa Parse error:', error);
        toast.error('Terjadi kesalahan saat membaca file CSV.');
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <BuildingIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Manajemen Kode SKPD
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola daftar Satuan Kerja Perangkat Daerah
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
            disabled={isUploading}
          />
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
            onClick={handleUploadButtonClick}
            disabled={isUploading}
          >
            {isUploading ? 'Mengunggah...' : <><UploadIcon className="h-4 w-4" /> Upload CSV</>}
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
            onClick={handleDownloadSkpdCSV}
          >
            <FileDownIcon className="h-4 w-4" /> Download CSV
          </Button>
          <Button
            onClick={() => setIsAddSkpdModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <PlusCircleIcon className="h-4 w-4" /> Tambah SKPD
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <BuildingIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Daftar Kode SKPD
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan Nama atau Kode SKPD..."
                className="pl-9 w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="items-per-page" className="whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">Baris per halaman:</Label>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
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
                  <SelectItem value="-1">Semua</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950 dark:hover:to-teal-950 border-b border-emerald-100 dark:border-emerald-900">
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Nama SKPD</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Kode SKPD</TableHead>
                  <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Kode SKPD Penagihan</TableHead>
                  <TableHead className="text-center font-bold text-emerald-900 dark:text-emerald-100">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingData && !loadingPagination ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Memuat data SKPD...
                    </TableCell>
                  </TableRow>
                ) : skpdList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Tidak ada data SKPD ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  skpdList.map((skpd) => (
                    <TableRow key={skpd.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <TableCell className="font-medium">{skpd.nama_skpd}</TableCell>
                      <TableCell>{skpd.kode_skpd}</TableCell>
                      <TableCell>{skpd.kode_skpd_penagihan || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title="Edit SKPD"
                            onClick={() => handleEditClick(skpd)}
                            className="hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Hapus SKPD"
                            onClick={() => handleDeleteClick(skpd)}
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

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Menampilkan <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalItems === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-semibold text-emerald-600 dark:text-emerald-400">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalItems}</span> item
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || itemsPerPage === -1 || loadingPagination}
                className="hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>
              <div className="text-sm text-slate-600 dark:text-slate-400 px-2">
                Hal. <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalItems === 0 ? 0 : currentPage}</span> / <span className="font-semibold">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || itemsPerPage === -1 || loadingPagination}
                className="hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 transition-colors"
              >
                Berikutnya
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
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
        skpdOptionsForPenagihan={skpdOptionsForPenagihan} // NEW: Pass options
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Konfirmasi Penghapusan SKPD"
        message={`Apakah Anda yakin ingin menghapus SKPD "${skpdToDelete?.namaSkpd || ''}"? Tindakan ini tidak dapat diurungkan.`}
      />
    </div >
  );
};

export default AdminKodeSKPD;