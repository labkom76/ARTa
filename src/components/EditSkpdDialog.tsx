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
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Combobox } from '@/components/ui/combobox';
import { BuildingIcon } from 'lucide-react';

interface SkpdData {
  id: string;
  nama_skpd: string;
  kode_skpd: string;
  created_at: string;
  kode_skpd_penagihan?: string | null; // NEW: Add kode_skpd_penagihan
}

interface EditSkpdDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkpdUpdated: () => void;
  editingSkpd: SkpdData | null;
  skpdOptionsForPenagihan: { value: string; label: string }[]; // NEW: Add options for combobox
}

const formSchema = z.object({
  nama_skpd: z.string().min(1, { message: 'Nama SKPD wajib diisi.' }),
  kode_skpd: z.string().min(1, { message: 'Kode SKPD wajib diisi.' }),
  kode_skpd_penagihan: z.string().optional().nullable(), // NEW: Add kode_skpd_penagihan, optional and nullable
});

type EditSkpdFormValues = z.infer<typeof formSchema>;

const EditSkpdDialog: React.FC<EditSkpdDialogProps> = ({ isOpen, onClose, onSkpdUpdated, editingSkpd, skpdOptionsForPenagihan }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditSkpdFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_skpd: '',
      kode_skpd: '',
      kode_skpd_penagihan: null, // NEW: Default to null
    },
  });

  useEffect(() => {
    if (isOpen && editingSkpd) {
      form.reset({
        nama_skpd: editingSkpd.nama_skpd,
        kode_skpd: editingSkpd.kode_skpd,
        kode_skpd_penagihan: editingSkpd.kode_skpd_penagihan || null, // NEW: Set existing value or null
      });
    } else if (isOpen && !editingSkpd) {
      form.reset(); // Reset form if no editingSkpd (shouldn't happen for this dialog)
    }
  }, [isOpen, editingSkpd, form]);

  const onSubmit = async (values: EditSkpdFormValues) => {
    if (!editingSkpd) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('master_skpd')
        .update({
          nama_skpd: values.nama_skpd,
          kode_skpd: values.kode_skpd,
          kode_skpd_penagihan: values.kode_skpd_penagihan, // NEW: Include kode_skpd_penagihan
        })
        .eq('id', editingSkpd.id);

      if (error) {
        if (error.code === '23505') { // Unique violation error code
          toast.error('Gagal memperbarui SKPD: Kode SKPD sudah ada.');
        } else {
          throw error;
        }
      } else {
        toast.success('SKPD berhasil diperbarui!');
        onSkpdUpdated(); // Trigger refresh in parent component
        onClose(); // Close the dialog
      }
    } catch (error: any) {
      console.error('Error updating SKPD:', error.message);
      toast.error('Terjadi kesalahan saat memperbarui SKPD: ' + error.message);
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
                Edit SKPD
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 mt-0.5">
                Perbarui detail SKPD di bawah ini
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

            <div className="space-y-2">
              <Label htmlFor="kode_skpd_penagihan" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode SKPD Penagihan (Opsional)
              </Label>
              <Controller
                name="kode_skpd_penagihan"
                control={form.control}
                render={({ field }) => (
                  <Combobox
                    options={skpdOptionsForPenagihan}
                    value={field.value || ''}
                    onValueChange={(value) => field.onChange(value === '' ? null : value)}
                    placeholder="Pilih Kode SKPD Penagihan"
                    disabled={isSubmitting}
                    className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                    clearable
                  />
                )}
              />
              {form.formState.errors.kode_skpd_penagihan && (
                <p className="text-red-500 text-xs mt-1">
                  {form.formState.errors.kode_skpd_penagihan.message}
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
              {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSkpdDialog;