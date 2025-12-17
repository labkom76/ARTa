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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { PencilIcon, SaveIcon } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Tagihan {
    id_tagihan: string;
    nama_skpd: string;
    nomor_spm: string;
    jenis_spm: string;
    jenis_tagihan: string;
    uraian: string;
    jumlah_kotor: number;
    status_tagihan: string;
    sumber_dana?: string;
}

interface EditTagihanVerifikatorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onTagihanUpdated: () => void;
    editingTagihan: Tagihan | null;
}

const formSchema = z.object({
    nomor_spm: z.string().min(1, { message: 'Nomor SPM wajib diisi.' }),
    uraian: z.string().min(1, { message: 'Uraian wajib diisi.' }),
    jumlah_kotor: z.preprocess(
        (val) => Number(val),
        z.number().min(0, { message: 'Jumlah Kotor harus angka positif.' })
    ),
    jenis_spm: z.string().min(1, { message: 'Jenis SPM wajib dipilih.' }),
    jenis_tagihan: z.string().min(1, { message: 'Jenis Tagihan wajib dipilih.' }),
    sumber_dana: z.string().min(1, { message: 'Sumber Dana wajib dipilih.' }),
});

type EditTagihanFormValues = z.infer<typeof formSchema>;

const EditTagihanVerifikatorDialog: React.FC<EditTagihanVerifikatorDialogProps> = ({
    isOpen,
    onClose,
    onTagihanUpdated,
    editingTagihan
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nomorUrut, setNomorUrut] = useState<string>('');
    const [copiedSpm, setCopiedSpm] = useState(false);

    const form = useForm<EditTagihanFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nomor_spm: '',
            uraian: '',
            jumlah_kotor: 0,
            jenis_spm: '',
            jenis_tagihan: '',
            sumber_dana: '',
        },
    });

    useEffect(() => {
        if (isOpen && editingTagihan) {
            // Parse SPM number to extract nomor urut (3rd segment)
            const parts = editingTagihan.nomor_spm.split('/');
            if (parts.length >= 3) {
                // Remove leading zeros for display in input
                const nomorUrutWithZeros = parts[2];
                const nomorUrutWithoutZeros = parseInt(nomorUrutWithZeros, 10).toString();
                setNomorUrut(nomorUrutWithoutZeros);
            }

            form.reset({
                nomor_spm: editingTagihan.nomor_spm,
                uraian: editingTagihan.uraian,
                jumlah_kotor: editingTagihan.jumlah_kotor,
                jenis_spm: editingTagihan.jenis_spm,
                jenis_tagihan: editingTagihan.jenis_tagihan,
                sumber_dana: editingTagihan.sumber_dana || '',
            });
        } else if (isOpen && !editingTagihan) {
            form.reset();
            setNomorUrut('');
        }
    }, [isOpen, editingTagihan, form]);

    // Compute preview SPM with current nomor urut
    const previewSpm = React.useMemo(() => {
        if (!editingTagihan?.nomor_spm || !nomorUrut) return editingTagihan?.nomor_spm || '';
        const parts = editingTagihan.nomor_spm.split('/');
        if (parts.length >= 3) {
            parts[2] = nomorUrut.padStart(6, '0');
        }
        return parts.join('/');
    }, [editingTagihan?.nomor_spm, nomorUrut]);

    const onSubmit = async (values: EditTagihanFormValues) => {
        if (!editingTagihan) return;

        setIsSubmitting(true);
        try {
            // Reconstruct full SPM number with new nomor urut
            const parts = editingTagihan.nomor_spm.split('/');
            if (parts.length >= 3) {
                parts[2] = nomorUrut.padStart(6, '0'); // Replace 3rd segment with new nomor urut
            }
            const fullNomorSpm = parts.join('/');

            const { error } = await supabase
                .from('database_tagihan')
                .update({
                    nomor_spm: fullNomorSpm,
                    nomor_urut: parseInt(nomorUrut) || 0,
                    uraian: values.uraian,
                    jumlah_kotor: values.jumlah_kotor,
                    jenis_spm: values.jenis_spm,
                    jenis_tagihan: values.jenis_tagihan,
                    sumber_dana: values.sumber_dana,
                })
                .eq('id_tagihan', editingTagihan.id_tagihan);

            if (error) throw error;

            // Log activity to database - only record changed fields
            try {
                const { data: { user } } = await supabase.auth.getUser();

                // Build changes object with only modified fields
                const perubahan: Record<string, { dari: any; menjadi: any }> = {};

                // Reconstruct full SPM for comparison
                const parts = editingTagihan.nomor_spm.split('/');
                if (parts.length >= 3) {
                    parts[2] = nomorUrut.padStart(6, '0');
                }
                const fullNomorSpm = parts.join('/');

                if (editingTagihan.nomor_spm !== fullNomorSpm) {
                    perubahan.nomor_spm = { dari: editingTagihan.nomor_spm, menjadi: fullNomorSpm };
                }
                if (editingTagihan.uraian !== values.uraian) {
                    perubahan.uraian = { dari: editingTagihan.uraian, menjadi: values.uraian };
                }
                if (editingTagihan.jumlah_kotor !== values.jumlah_kotor) {
                    perubahan.jumlah_kotor = { dari: editingTagihan.jumlah_kotor, menjadi: values.jumlah_kotor };
                }
                if (editingTagihan.jenis_spm !== values.jenis_spm) {
                    perubahan.jenis_spm = { dari: editingTagihan.jenis_spm, menjadi: values.jenis_spm };
                }
                if (editingTagihan.jenis_tagihan !== values.jenis_tagihan) {
                    perubahan.jenis_tagihan = { dari: editingTagihan.jenis_tagihan, menjadi: values.jenis_tagihan };
                }
                if (editingTagihan.sumber_dana !== values.sumber_dana) {
                    perubahan.sumber_dana = { dari: editingTagihan.sumber_dana, menjadi: values.sumber_dana };
                }

                // Only log if there are actual changes
                if (Object.keys(perubahan).length > 0) {
                    await supabase.from('activity_log').insert({
                        user_id: user?.id,
                        user_role: 'Staf Verifikator',
                        action: 'TAGIHAN_UPDATED',
                        tagihan_terkait: editingTagihan.id_tagihan,
                        details: {
                            nomor_spm: editingTagihan.nomor_spm,
                            perubahan
                        }
                    });
                }
            } catch (logError: any) {
                console.error('Failed to log activity:', logError);
                // Don't throw - logging failure shouldn't fail the update
            }

            toast.success('Tagihan berhasil diperbarui!');
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
                <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <PencilIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                Edit Tagihan
                            </DialogTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                Perbarui informasi tagihan untuk SPM
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard.writeText(editingTagihan?.nomor_spm || '');
                                    setCopiedSpm(true);
                                    toast.success('Nomor SPM berhasil disalin!');
                                    setTimeout(() => setCopiedSpm(false), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                                title="Klik untuk menyalin"
                            >
                                {copiedSpm ? (
                                    <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                <code className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-100">
                                    {previewSpm}
                                </code>
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
                    {/* Read-only Info Section */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-emerald-500"></div>
                            Informasi Tagihan
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400">Nama SKPD</Label>
                                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">
                                    {editingTagihan?.nama_skpd}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="nomor_urut_spm" className="text-xs text-slate-500 dark:text-slate-400">
                                    Nomor Urut SPM <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="nomor_urut_spm"
                                    type="number"
                                    value={nomorUrut}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Only allow numbers, max 6 digits
                                        if (/^\d*$/.test(value) && value.length <= 6) {
                                            setNomorUrut(value);
                                        }
                                    }}
                                    placeholder="000000"
                                    min="1"
                                    max="999999"
                                    disabled={isSubmitting}
                                    className="font-mono text-center text-lg font-bold border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500"
                                />
                                {!nomorUrut && (
                                    <p className="text-red-500 text-xs">Nomor urut wajib diisi.</p>
                                )}
                                {nomorUrut && parseInt(nomorUrut) < 1 && (
                                    <p className="text-red-500 text-xs">Nomor urut harus lebih dari 0.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-4">
                        {/* Jenis SPM & Jenis Tagihan */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jenis_spm" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Jenis SPM <span className="text-red-500">*</span>
                                </Label>
                                <Controller
                                    name="jenis_spm"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                            <SelectTrigger className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500">
                                                <SelectValue placeholder="Pilih Jenis SPM" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Belanja Pegawai">Belanja Pegawai</SelectItem>
                                                <SelectItem value="Belanja Barang dan Jasa">Belanja Barang dan Jasa</SelectItem>
                                                <SelectItem value="Belanja Modal">Belanja Modal</SelectItem>
                                                <SelectItem value="Lainnya">Lainnya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {form.formState.errors.jenis_spm && (
                                    <p className="text-red-500 text-xs">{form.formState.errors.jenis_spm.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="jenis_tagihan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Jenis Tagihan <span className="text-red-500">*</span>
                                </Label>
                                <Controller
                                    name="jenis_tagihan"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                            <SelectTrigger className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500">
                                                <SelectValue placeholder="Pilih Jenis Tagihan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Uang Persediaan (UP)">Uang Persediaan (UP)</SelectItem>
                                                <SelectItem value="Ganti Uang Persediaan (GU)">Ganti Uang Persediaan (GU)</SelectItem>
                                                <SelectItem value="Langsung (LS)">Langsung (LS)</SelectItem>
                                                <SelectItem value="Tambah Uang Persediaan (TU)">Tambah Uang Persediaan (TU)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {form.formState.errors.jenis_tagihan && (
                                    <p className="text-red-500 text-xs">{form.formState.errors.jenis_tagihan.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Sumber Dana */}
                        <div className="space-y-2">
                            <Label htmlFor="sumber_dana" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Sumber Dana <span className="text-red-500">*</span>
                            </Label>
                            <Controller
                                name="sumber_dana"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                        <SelectTrigger className="border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500">
                                            <SelectValue placeholder="Pilih Sumber Dana" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Pendapatan Asli Daerah">Pendapatan Asli Daerah</SelectItem>
                                            <SelectItem value="Dana Bagi Hasil">Dana Bagi Hasil</SelectItem>
                                            <SelectItem value="DAU - BG">DAU - BG</SelectItem>
                                            <SelectItem value="DAU - SG">DAU - SG</SelectItem>
                                            <SelectItem value="DAK - Fisik">DAK - Fisik</SelectItem>
                                            <SelectItem value="DAK - Non Fisik">DAK - Non Fisik</SelectItem>
                                            <SelectItem value="Dana Desa">Dana Desa</SelectItem>
                                            <SelectItem value="Insentif Fiskal">Insentif Fiskal</SelectItem>
                                            <SelectItem value="Pendapatan Transfer Antar Daerah">Pendapatan Transfer Antar Daerah</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {form.formState.errors.sumber_dana && (
                                <p className="text-red-500 text-xs">{form.formState.errors.sumber_dana.message}</p>
                            )}
                        </div>

                        {/* Uraian */}
                        <div className="space-y-2">
                            <Label htmlFor="uraian" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Uraian <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="uraian"
                                {...form.register('uraian')}
                                className="border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 focus:ring-emerald-500 min-h-[100px]"
                                placeholder="Masukkan uraian tagihan..."
                                disabled={isSubmitting}
                            />
                            {form.formState.errors.uraian && (
                                <p className="text-red-500 text-xs">{form.formState.errors.uraian.message}</p>
                            )}
                        </div>

                        {/* Jumlah Kotor */}
                        <div className="space-y-2">
                            <Label htmlFor="jumlah_kotor" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Jumlah Kotor <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">Rp</span>
                                <Input
                                    id="jumlah_kotor"
                                    type="number"
                                    {...form.register('jumlah_kotor')}
                                    className="pl-10 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="0"
                                    disabled={isSubmitting}
                                />
                            </div>
                            {form.formState.errors.jumlah_kotor && (
                                <p className="text-red-500 text-xs">{form.formState.errors.jumlah_kotor.message}</p>
                            )}
                        </div>
                    </div>
                </form>

                <DialogFooter className="border-t border-emerald-100 dark:border-emerald-900/30 pt-4">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-initial"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                            <SaveIcon className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditTagihanVerifikatorDialog;
