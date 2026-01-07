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
import { EditIcon, CoinsIcon } from 'lucide-react';

interface SumberDanaData {
    id: string;
    nama_sumber_dana: string;
}

interface EditSumberDanaDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSumberDanaUpdated: () => void;
    editingSumberDana: SumberDanaData | null;
}

const formSchema = z.object({
    nama_sumber_dana: z.string().min(1, { message: 'Nama Sumber Dana wajib diisi.' }),
});

type EditSumberDanaFormValues = z.infer<typeof formSchema>;

const EditSumberDanaDialog: React.FC<EditSumberDanaDialogProps> = ({ isOpen, onClose, onSumberDanaUpdated, editingSumberDana }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EditSumberDanaFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nama_sumber_dana: '',
        },
    });

    useEffect(() => {
        if (isOpen && editingSumberDana) {
            form.reset({
                nama_sumber_dana: editingSumberDana.nama_sumber_dana,
            });
        }
    }, [isOpen, editingSumberDana, form]);

    const onSubmit = async (values: EditSumberDanaFormValues) => {
        if (!editingSumberDana) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('master_sumber_dana')
                .update({
                    nama_sumber_dana: values.nama_sumber_dana,
                })
                .eq('id', editingSumberDana.id);

            if (error) {
                if (error.code === '23505') {
                    toast.error('Gagal memperbarui: Nama Sumber Dana sudah ada.');
                } else {
                    throw error;
                }
            } else {
                toast.success('Sumber Dana berhasil diperbarui!');
                onSumberDanaUpdated();
                onClose();
            }
        } catch (error: any) {
            console.error('Error updating sumber dana:', error.message);
            toast.error('Terjadi kesalahan: ' + error.message);
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
                            <EditIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                Edit Sumber Dana
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-slate-400 mt-0.5">
                                Perbarui nama sumber dana di bawah ini
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nama_sumber_dana" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Nama Sumber Dana <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="nama_sumber_dana"
                                {...form.register('nama_sumber_dana')}
                                placeholder="Contoh: Pendapatan Asli Daerah (PAD)"
                                className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
                                disabled={isSubmitting}
                            />
                            {form.formState.errors.nama_sumber_dana && (
                                <p className="text-red-500 text-xs mt-1">
                                    {form.formState.errors.nama_sumber_dana.message}
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
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                        >
                            {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditSumberDanaDialog;
