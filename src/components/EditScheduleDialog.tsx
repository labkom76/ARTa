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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleData {
  id: string;
  kode_jadwal: string;
  deskripsi_jadwal: string;
  created_at: string;
}

interface EditScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated: () => void;
  editingSchedule: ScheduleData | null;
}

const formSchema = z.object({
  kode_jadwal: z.string().min(1, { message: 'Kode Jadwal wajib diisi.' }),
  deskripsi_jadwal: z.string().min(1, { message: 'Deskripsi Jadwal wajib diisi.' }),
});

type EditScheduleFormValues = z.infer<typeof formSchema>;

const EditScheduleDialog: React.FC<EditScheduleDialogProps> = ({ isOpen, onClose, onScheduleUpdated, editingSchedule }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kode_jadwal: '',
      deskripsi_jadwal: '',
    },
  });

  useEffect(() => {
    if (isOpen && editingSchedule) {
      form.reset({
        kode_jadwal: editingSchedule.kode_jadwal,
        deskripsi_jadwal: editingSchedule.deskripsi_jadwal,
      });
    } else if (isOpen && !editingSchedule) {
      form.reset(); // Reset form if no editingSchedule (shouldn't happen for this dialog)
    }
  }, [isOpen, editingSchedule, form]);

  const onSubmit = async (values: EditScheduleFormValues) => {
    if (!editingSchedule) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('master_jadwal')
        .update({
          kode_jadwal: values.kode_jadwal,
          deskripsi_jadwal: values.deskripsi_jadwal,
        })
        .eq('id', editingSchedule.id);

      if (error) {
        if (error.code === '23505') { // Unique violation error code
          toast.error('Gagal memperbarui jadwal: Kode Jadwal sudah ada.');
        } else {
          throw error;
        }
      } else {
        toast.success('Jadwal berhasil diperbarui!');
        onScheduleUpdated(); // Trigger refresh in parent component
        onClose(); // Close the dialog
      }
    } catch (error: any) {
      console.error('Error updating schedule:', error.message);
      toast.error('Terjadi kesalahan saat memperbarui jadwal: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Jadwal</DialogTitle>
          <DialogDescription>
            Perbarui detail jadwal penganggaran di sini. Klik simpan setelah selesai.
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
              {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditScheduleDialog;