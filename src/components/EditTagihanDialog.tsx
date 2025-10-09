import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

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
  catatan_verifikator?: string;
  nomor_registrasi?: string;
  waktu_registrasi?: string;
  nama_registrator?: string;
  waktu_verifikasi?: string;
  detail_verifikasi?: { item: string; memenuhi_syarat: boolean; keterangan: string }[];
  nomor_verifikasi?: string;
  nama_verifikator?: string;
  nomor_koreksi?: string;
  id_korektor?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
}

interface EditTagihanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTagihanUpdated: () => void;
  editingTagihan: Tagihan | null;
}

const formSchema = z.object({
  nama_skpd: z.string().min(1, { message: 'Nama SKPD wajib diisi.' }),
  nomor_spm: z.string().min(1, { message: 'Nomor SPM wajib diisi.' }),
  uraian: z.string().min(1, { message: 'Uraian wajib diisi.' }),
  jumlah_kotor: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: 'Jumlah Kotor harus angka positif.' })
  ),
  jenis_spm: z.string().min(1, { message: 'Jenis SPM wajib dipilih.' }),
  jenis_tagihan: z.string().min(1, { message: 'Jenis Tagihan wajib dipilih.' }),
  status_tagihan: z.enum(['Menunggu Registrasi', 'Menunggu Verifikasi', 'Diteruskan', 'Dikembalikan'], {
    required_error: 'Status Tagihan wajib dipilih.',
  }),
});

type EditTagihanFormValues = z.infer<typeof formSchema>;

const EditTagihanDialog: React.FC<EditTagihanDialogProps> = ({ isOpen, onClose, onTagihanUpdated, editingTagihan }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditTagihanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_skpd: '',
      nomor_spm: '',
      uraian: '',
      jumlah_kotor: 0,
      jenis_spm: '',
      jenis_tagihan: '',
      status_tagihan: 'Menunggu Registrasi',
    },
  });

  useEffect(() => {
    if (isOpen && editingTagihan) {
      form.reset({
        nama_skpd: editingTagihan.nama_skpd,
        nomor_spm: editingTagihan.nomor_spm,
        uraian: editingTagihan.uraian,
        jumlah_kotor: editingTagihan.jumlah_kotor,
        jenis_spm: editingTagihan.jenis_spm,
        jenis_tagihan: editingTagihan.jenis_tagihan,
        status_tagihan: editingTagihan.status_tagihan as EditTagihanFormValues['status_tagihan'],
      });
    } else if (isOpen && !editingTagihan) {
      form.reset(); // Reset form if no editingTagihan (shouldn't happen for this dialog)
    }
  }, [isOpen, editingTagihan, form]);

  const onSubmit = async (values: EditTagihanFormValues) => {
    if (!editingTagihan) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('database_tagihan')
        .update({
          nama_skpd: values.nama_skpd,
          nomor_spm: values.nomor_spm,
          uraian: values.uraian,
          jumlah_kotor: values.jumlah_kotor,
          jenis_spm: values.jenis_spm,
          jenis_tagihan: values.jenis_tagihan,
          status_tagihan: values.status_tagihan,
        })
        .eq('id_tagihan', editingTagihan.id_tagihan);

      if (error) throw error;

      toast.success('Tagihan berhasil diperbarui oleh Administrator!');
      onTagihanUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating tagihan:', error.message);
      toast.error('Gagal memperbarui tagihan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tagihan (Admin Override)</DialogTitle>
          <DialogDescription>
            Perbarui detail tagihan ini. Semua field dapat diedit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nama_skpd" className="text-right">
              Nama SKPD
            </Label>
            <Input
              id="nama_skpd"
              {...form.register('nama_skpd')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.nama_skpd && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.nama_skpd.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nomor_spm" className="text-right">
              Nomor SPM
            </Label>
            <Input
              id="nomor_spm"
              {...form.register('nomor_spm')}
              className="col-span-3"
              disabled={isSubmitting}
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
            <Select onValueChange={(value) => form.setValue('jenis_spm', value)} value={form.watch('jenis_spm')} disabled={isSubmitting}>
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
            <Select onValueChange={(value) => form.setValue('jenis_tagihan', value)} value={form.watch('jenis_tagihan')} disabled={isSubmitting}>
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
            <Textarea
              id="uraian"
              {...form.register('uraian')}
              className="col-span-3"
              rows={3}
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
            {form.formState.errors.jumlah_kotor && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.jumlah_kotor.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status_tagihan" className="text-right">
              Status Tagihan
            </Label>
            <Select onValueChange={(value) => form.setValue('status_tagihan', value as EditTagihanFormValues['status_tagihan'])} value={form.watch('status_tagihan')} disabled={isSubmitting}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Menunggu Registrasi">Menunggu Registrasi</SelectItem>
                <SelectItem value="Menunggu Verifikasi">Menunggu Verifikasi</SelectItem>
                <SelectItem value="Diteruskan">Diteruskan</SelectItem>
                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.status_tagihan && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.status_tagihan.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTagihanDialog;