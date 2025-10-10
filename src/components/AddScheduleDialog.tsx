import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea'; // Import Textarea for deskripsi_jadwal
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

interface AddScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleAdded: () => void;
}

const formSchema = z.object({
  kode_jadwal: z.string().min(1, { message: 'Kode Jadwal wajib diisi.' }),
  deskripsi_jadwal: z.string().min(1, { message: 'Deskripsi Jadwal wajib diisi.' }),
});

type AddScheduleFormValues = z.infer<typeof formSchema>;

const AddScheduleDialog: React.FC<AddScheduleDialogProps> = ({ isOpen, onClose, onScheduleAdded }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kode_jadwal: '',
      deskripsi_jadwal: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(); // Reset form when dialog opens
    }
  }, [isOpen, form]);

  const onSubmit = async (values: AddScheduleFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('master_jadwal')
        .insert({
          kode_jadwal: values.kode_jadwal,
          deskripsi_jadwal: values.deskripsi_jadwal,
        });

      if (error) {
        if (error.code === '23505') { // Unique violation error code
          toast.error('Gagal menambahkan jadwal: Kode Jadwal sudah ada.');
        } else {
          throw error;
        }
      } else {
        toast.success('Jadwal baru berhasil ditambahkan!');
        onScheduleAdded(); // Trigger refresh in parent component
        onClose(); // Close the dialog
      }
    } catch (error: any) {
      console.error('Error adding schedule:', error.message);
      toast.error('Terjadi kesalahan saat menambahkan jadwal: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Jadwal Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail jadwal penganggaran baru di sini. Klik simpan setelah selesai.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="kode_jadwal" className="text-right">
              Kode Jadwal
            </Label>
            <Input
              id="kode_jadwal"
              {...form.register('kode_jadwal')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.kode_jadwal && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.kode_jadwal.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deskripsi_jadwal" className="text-right">
              Deskripsi Jadwal
            </Label>
            <Textarea
              id="deskripsi_jadwal"
              {...form.register('deskripsi_jadwal')}
              className="col-span-3"
              rows={3}
              disabled={isSubmitting}
            />
            {form.formState.errors.deskripsi_jadwal && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.deskripsi_jadwal.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddScheduleDialog;