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
import { Combobox } from '@/components/ui/combobox'; // NEW: Import Combobox

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit SKPD</DialogTitle>
          <DialogDescription>
            Perbarui detail SKPD di sini. Klik simpan setelah selesai.
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
          {/* NEW: Kode SKPD Penagihan Combobox */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="kode_skpd_penagihan" className="text-right">
              Kode SKPD Penagihan (Opsional)
            </Label>
            <Controller
              name="kode_skpd_penagihan"
              control={form.control}
              render={({ field }) => (
                <Combobox
                  options={skpdOptionsForPenagihan}
                  value={field.value || ''}
                  onValueChange={(value) => field.onChange(value === '' ? null : value)} // Handle clearing selection
                  placeholder="Pilih Kode SKPD Penagihan"
                  disabled={isSubmitting}
                  className="col-span-3"
                  clearable // Add clearable prop to Combobox
                />
              )}
            />
            {form.formState.errors.kode_skpd_penagihan && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.kode_skpd_penagihan.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSkpdDialog;