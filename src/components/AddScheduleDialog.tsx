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
import { CalendarClockIcon } from 'lucide-react';

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
      <DialogContent className="sm:max-w-[500px] border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <CalendarClockIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Tambah Jadwal Baru
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 mt-0.5">
                Masukkan detail jadwal penganggaran baru di bawah ini
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kode_jadwal" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode Jadwal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kode_jadwal"
                {...form.register('kode_jadwal')}
                placeholder="Contoh: 2024-MURNI"
                className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isSubmitting}
              />
              {form.formState.errors.kode_jadwal && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.kode_jadwal.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deskripsi_jadwal" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Deskripsi Jadwal <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="deskripsi_jadwal"
                {...form.register('deskripsi_jadwal')}
                placeholder="Contoh: Anggaran Murni Tahun 2024"
                className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 min-h-[100px]"
                disabled={isSubmitting}
              />
              {form.formState.errors.deskripsi_jadwal && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.deskripsi_jadwal.message}
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Jadwal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddScheduleDialog;