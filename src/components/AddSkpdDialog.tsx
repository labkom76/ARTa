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
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

interface AddSkpdDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkpdAdded: () => void;
}

const formSchema = z.object({
  nama_skpd: z.string().min(1, { message: 'Nama SKPD wajib diisi.' }),
  kode_skpd: z.string().min(1, { message: 'Kode SKPD wajib diisi.' }),
});

type AddSkpdFormValues = z.infer<typeof formSchema>;

const AddSkpdDialog: React.FC<AddSkpdDialogProps> = ({ isOpen, onClose, onSkpdAdded }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddSkpdFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_skpd: '',
      kode_skpd: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(); // Reset form when dialog opens
    }
  }, [isOpen, form]);

  const onSubmit = async (values: AddSkpdFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('master_skpd')
        .insert({
          nama_skpd: values.nama_skpd,
          kode_skpd: values.kode_skpd,
        });

      if (error) {
        if (error.code === '23505') { // Unique violation error code
          toast.error('Gagal menambahkan SKPD: Kode SKPD sudah ada.');
        } else {
          throw error;
        }
      } else {
        toast.success('SKPD baru berhasil ditambahkan!');
        onSkpdAdded(); // Trigger refresh in parent component
        onClose(); // Close the dialog
      }
    } catch (error: any) {
      console.error('Error adding SKPD:', error.message);
      toast.error('Terjadi kesalahan saat menambahkan SKPD: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah SKPD Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail SKPD baru di sini. Klik simpan setelah selesai.
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
            <Label htmlFor="kode_skpd" className="text-right">
              Kode SKPD
            </Label>
            <Input
              id="kode_skpd"
              {...form.register('kode_skpd')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.kode_skpd && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.kode_skpd.message}
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

export default AddSkpdDialog;