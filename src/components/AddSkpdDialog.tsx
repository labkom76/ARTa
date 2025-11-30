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
import { BuildingIcon } from 'lucide-react';

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
      <DialogContent className="sm:max-w-[500px] border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <BuildingIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Tambah SKPD Baru
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 mt-0.5">
                Masukkan detail SKPD baru di bawah ini
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_skpd" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nama SKPD <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama_skpd"
                {...form.register('nama_skpd')}
                placeholder="Contoh: Dinas Pendidikan"
                className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isSubmitting}
              />
              {form.formState.errors.nama_skpd && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.nama_skpd.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kode_skpd" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode SKPD <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kode_skpd"
                {...form.register('kode_skpd')}
                placeholder="Contoh: 1.01.01"
                className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isSubmitting}
              />
              {form.formState.errors.kode_skpd && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.kode_skpd.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan SKPD'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSkpdDialog;