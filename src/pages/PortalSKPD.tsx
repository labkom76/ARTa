import React, { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircleIcon, SearchIcon } from 'lucide-react';

// Zod schema for form validation
const formSchema = z.object({
  nomor_spm: z.string().min(1, { message: 'Nomor SPM wajib diisi.' }),
  uraian: z.string().min(1, { message: 'Uraian wajib diisi.' }),
  jumlah_kotor: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: 'Jumlah Kotor harus angka positif.' })
  ),
  jenis_spm: z.string().min(1, { message: 'Jenis SPM wajib dipilih.' }),
  jenis_tagihan: z.string().min(1, { message: 'Jenis Tagihan wajib dipilih.' }),
});

type TagihanFormValues = z.infer<typeof formSchema>;

interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  jenis_spm: string;
  jenis_tagihan: string;
  uraian: string;
  jumlah_kotor: number;
  status_tagihan: string;
  waktu_input: string;
  id_pengguna_input: string;
}

const PortalSKPD = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalItems, setTotalItems] = useState(0);

  const form = useForm<TagihanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomor_spm: '',
      uraian: '',
      jumlah_kotor: 0,
      jenis_spm: '',
      jenis_tagihan: '',
    },
  });

  const fetchTagihan = async () => {
    if (!user || sessionLoading) return;

    setLoading(true);
    try {
      let query = supabase
        .from('database_tagihan')
        .select('*', { count: 'exact' })
        .eq('id_pengguna_input', user.id);

      if (searchQuery) {
        query = query.ilike('nomor_spm', `%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('waktu_input', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;

      setTagihanList(data as Tagihan[]);
      setTotalItems(count || 0);
    } catch (error: any) {
      console.error('Error fetching tagihan:', error.message);
      toast.error('Gagal memuat daftar tagihan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTagihan();
  }, [user, sessionLoading, searchQuery, currentPage]);

  const onSubmit = async (values: TagihanFormValues) => {
    if (!user || !profile) {
      toast.error('Anda harus login untuk membuat tagihan.');
      return;
    }

    try {
      const { error } = await supabase.from('database_tagihan').insert({
        id_pengguna_input: user.id,
        nama_skpd: profile.asal_skpd, // Automatically set from user profile
        nomor_spm: values.nomor_spm,
        uraian: values.uraian,
        jumlah_kotor: values.jumlah_kotor,
        jenis_spm: values.jenis_spm,
        jenis_tagihan: values.jenis_tagihan,
        status_tagihan: 'Menunggu Registrasi', // Default status
      });

      if (error) throw error;

      toast.success('Tagihan baru berhasil disimpan!');
      form.reset();
      setIsModalOpen(false);
      fetchTagihan(); // Refresh the list
    } catch (error: any) {
      console.error('Error saving tagihan:', error.message);
      toast.error('Gagal menyimpan tagihan: ' + error.message);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Portal SKPD</h1>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <PlusCircleIcon className="h-4 w-4" /> Input Tagihan Baru
        </Button>
      </div>

      <div className="mb-4 flex items-center space-x-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="text"
            placeholder="Cari berdasarkan Nomor SPM..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on new search
            }}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-400">Memuat tagihan...</p>
      ) : tagihanList.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada tagihan ditemukan.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor SPM</TableHead>
                  <TableHead>Jenis SPM</TableHead>
                  <TableHead>Jenis Tagihan</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead>Jumlah Kotor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagihanList.map((tagihan) => (
                  <TableRow key={tagihan.id_tagihan}>
                    <TableCell className="font-medium">{tagihan.nomor_spm}</TableCell>
                    <TableCell>{tagihan.jenis_spm}</TableCell>
                    <TableCell>{tagihan.jenis_tagihan}</TableCell>
                    <TableCell>{tagihan.uraian}</TableCell>
                    <TableCell>Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</TableCell>
                    <TableCell>{tagihan.status_tagihan}</TableCell>
                    <TableCell className="text-center">
                      {/* Placeholder for action buttons */}
                      <Button variant="outline" size="sm" disabled>Detail</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    isActive={currentPage === index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Input Tagihan Baru</DialogTitle>
            <DialogDescription>
              Masukkan detail tagihan baru Anda di sini. Klik simpan setelah selesai.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nomor_spm" className="text-right">
                Nomor SPM
              </Label>
              <Input
                id="nomor_spm"
                {...form.register('nomor_spm')}
                className="col-span-3"
              />
              {form.formState.errors.nomor_spm && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.nomor_spm.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jenis_spm" className="text-right">
                Jenis SPM
              </Label>
              <Select onValueChange={(value) => form.setValue('jenis_spm', value)} value={form.watch('jenis_spm')}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Jenis SPM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Belanja Pegawai">Belanja Pegawai</SelectItem>
                  <SelectItem value="Belanja Barang dan Jasa">Belanja Barang dan Jasa</SelectItem>
                  <SelectItem value="Belanja Modal">Belanja Modal</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.jenis_spm && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jenis_spm.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jenis_tagihan" className="text-right">
                Jenis Tagihan
              </Label>
              <Select onValueChange={(value) => form.setValue('jenis_tagihan', value)} value={form.watch('jenis_tagihan')}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Jenis Tagihan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Uang Persediaan (UP)">Uang Persediaan (UP)</SelectItem>
                  <SelectItem value="Ganti Uang Persediaan (GU)">Ganti Uang Persediaan (GU)</SelectItem>
                  <SelectItem value="Langsung (LS)">Langsung (LS)</SelectItem>
                  <SelectItem value="Tambah Uang Persediaan (TU)">Tambah Uang Persediaan (TU)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.jenis_tagihan && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jenis_tagihan.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="uraian" className="text-right">
                Uraian
              </Label>
              <Input
                id="uraian"
                {...form.register('uraian')}
                className="col-span-3"
              />
              {form.formState.errors.uraian && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.uraian.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jumlah_kotor" className="text-right">
                Jumlah Kotor
              </Label>
              <Input
                id="jumlah_kotor"
                type="number"
                {...form.register('jumlah_kotor')}
                className="col-span-3"
              />
              {form.formState.errors.jumlah_kotor && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.jumlah_kotor.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortalSKPD;