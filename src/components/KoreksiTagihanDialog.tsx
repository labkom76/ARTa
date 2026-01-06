import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AlertTriangleIcon, Building2, Calendar, DollarSign, FileText } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

interface VerificationItem {
    item: string;
    memenuhi_syarat: boolean;
    keterangan: string;
}

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
    nomor_registrasi?: string;
    waktu_registrasi?: string;
    nama_registrator?: string;
    catatan_verifikator?: string;
    waktu_verifikasi?: string;
    detail_verifikasi?: VerificationItem[];
    nomor_verifikasi?: string;
    nama_verifikator?: string;
    locked_by?: string;
    locked_at?: string;
    nomor_koreksi?: string;
    id_korektor?: string;
    waktu_koreksi?: string;
    catatan_koreksi?: string;
    sumber_dana?: string;
    tanggal_spm?: string;
}

interface KoreksiTagihanDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCorrectionSuccess: () => void;
    tagihan: Tagihan | null;
}

const koreksiFormSchema = z.object({
    keterangan_koreksi: z.enum([
        'Kas sumber dana tidak cukup tersedia',
        'Kas sumber dana tidak cukup tersedia, prioritas belanja wajib rutin bulanan',
    ], {
        required_error: 'Keterangan koreksi wajib dipilih.',
    }),
});

type KoreksiFormValues = z.infer<typeof koreksiFormSchema>;

const KoreksiTagihanDialog: React.FC<KoreksiTagihanDialogProps> = ({ isOpen, onClose, onCorrectionSuccess, tagihan }) => {
    const { user, profile } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedNomorKoreksi, setGeneratedNomorKoreksi] = useState<string | null>(null);

    const form = useForm<KoreksiFormValues>({
        resolver: zodResolver(koreksiFormSchema),
        defaultValues: {
            keterangan_koreksi: undefined,
        },
    });

    const generateMonthlyCorrectionSequence = useCallback(async (): Promise<string> => {
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now).toISOString();
        const endOfCurrentMonth = endOfMonth(now).toISOString();

        const { data, error } = await supabase
            .from('database_tagihan')
            .select('nomor_koreksi')
            .not('nomor_koreksi', 'is', null)
            .gte('waktu_koreksi', startOfCurrentMonth)
            .lte('waktu_koreksi', endOfCurrentMonth);

        if (error) {
            console.error('Error fetching last correction number for sequence:', error.message);
            throw new Error('Gagal membuat nomor urut koreksi bulanan.');
        }

        let nextSequence = 1;
        if (data && data.length > 0) {
            let maxSequence = 0;
            data.forEach(item => {
                if (item.nomor_koreksi) {
                    const parts = item.nomor_koreksi.split('-K-');
                    if (parts.length === 2) {
                        const sequencePart = parseInt(parts[1], 10);
                        if (!isNaN(sequencePart) && sequencePart > maxSequence) {
                            maxSequence = sequencePart;
                        }
                    }
                }
            });
            nextSequence = maxSequence + 1;
        }

        return String(nextSequence).padStart(4, '0');
    }, []);

    const generateFullNomorKoreksi = useCallback(async (originalNomorRegistrasi: string): Promise<string> => {
        const regParts = originalNomorRegistrasi.split('-');
        const registrationSequence = regParts.length === 3 ? regParts[2] : originalNomorRegistrasi;

        const monthlyCorrectionSequence = await generateMonthlyCorrectionSequence();
        return `${parseInt(registrationSequence, 10)}-K-${monthlyCorrectionSequence}`;
    }, [generateMonthlyCorrectionSequence]);

    useEffect(() => {
        if (isOpen && tagihan?.nomor_registrasi) {
            form.reset({
                keterangan_koreksi: tagihan.catatan_koreksi as KoreksiFormValues['keterangan_koreksi'] || undefined,
            });
            const generateAndSetNomor = async () => {
                try {
                    const newNomor = await generateFullNomorKoreksi(tagihan.nomor_registrasi!);
                    setGeneratedNomorKoreksi(newNomor);
                } catch (error: any) {
                    toast.error(error.message);
                    setGeneratedNomorKoreksi(null);
                }
            };
            generateAndSetNomor();
        } else if (!isOpen) {
            setGeneratedNomorKoreksi(null);
            form.reset({ keterangan_koreksi: undefined });
        }
    }, [isOpen, tagihan, form, generateFullNomorKoreksi]);

    if (!tagihan) return null;

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '-';
        try {
            return format(parseISO(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return dateString;
        }
    };

    const onSubmit = async (values: KoreksiFormValues) => {
        if (!user || !profile?.nama_lengkap) {
            toast.error('Informasi pengguna tidak lengkap. Harap login ulang.');
            return;
        }
        if (!generatedNomorKoreksi) {
            toast.error('Nomor koreksi belum dibuat. Silakan coba lagi.');
            return;
        }

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            const { error } = await supabase
                .from('database_tagihan')
                .update({
                    status_tagihan: 'Dikembalikan',
                    catatan_koreksi: values.keterangan_koreksi,
                    id_korektor: user.id,
                    waktu_koreksi: now,
                    nomor_koreksi: generatedNomorKoreksi,
                    waktu_verifikasi: now,
                    nama_verifikator: profile.nama_lengkap,
                    nomor_verifikasi: generatedNomorKoreksi,
                    locked_by: null,
                    locked_at: null,
                })
                .eq('id_tagihan', tagihan.id_tagihan);

            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }

            const notificationMessage = `Perhatian! Tagihan SPM ${tagihan.nomor_spm} DIKEMBALIKAN oleh Staf Koreksi.`;
            const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    user_id: tagihan.id_pengguna_input,
                    message: notificationMessage,
                    is_read: false,
                    tagihan_id: tagihan.id_tagihan,
                });

            if (notificationError) {
                console.error('Error inserting notification:', notificationError.message);
            }

            toast.success(`Tagihan ${tagihan.nomor_spm} berhasil dikoreksi dan dikembalikan.`);
            onCorrectionSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error processing correction:', error.message);
            toast.error('Gagal memproses koreksi: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col bg-gradient-to-br from-white to-red-50/30 dark:from-slate-900 dark:to-red-950/20">
                <DialogHeader className="border-b border-red-100 dark:border-red-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                Konfirmasi Pengembalian
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Periksa detail tagihan dan masukkan keterangan koreksi untuk SPM {tagihan.nomor_spm}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                    <form id="koreksi-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                        {/* Nomor Koreksi Section */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-red-100 dark:border-red-900/30 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nomor Koreksi</h3>
                            </div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800/50">
                                {generatedNomorKoreksi || 'Membuat...'}
                            </p>
                        </div>

                        {/* Detail Tagihan Section */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Tagihan</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nomor Registrasi</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nomor_registrasi || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Waktu Registrasi
                                    </Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{formatDate(tagihan.waktu_registrasi)}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nama SKPD</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nama_skpd}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                        <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                        Tanggal SPM
                                    </Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">
                                        {tagihan.tanggal_spm ? format(parseISO(tagihan.tanggal_spm), 'dd MMMM yyyy', { locale: localeId }) : '-'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nomor SPM</Label>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild className="w-full text-left">
                                                <p className="font-mono text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg truncate cursor-help">
                                                    {tagihan.nomor_spm}
                                                </p>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p className="font-mono">{tagihan.nomor_spm}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jenis SPM</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.jenis_spm}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jenis Tagihan</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.jenis_tagihan}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sumber Dana</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.sumber_dana || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        Jumlah Kotor
                                    </Label>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                                        Rp {tagihan.jumlah_kotor.toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uraian</Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg leading-relaxed">{tagihan.uraian}</p>
                                </div>
                            </div>
                        </div>

                        {/* Input Koreksi Section */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-red-100 dark:border-red-900/30 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Input Koreksi</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800/50">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uraian</Label>
                                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">"Tidak dapat diterbitkan SP2D"</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Keterangan <span className="text-red-500">*</span>
                                    </Label>
                                    <Controller
                                        name="keterangan_koreksi"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Pilih Keterangan Koreksi" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Kas sumber dana tidak cukup tersedia">
                                                        Kas sumber dana tidak cukup tersedia
                                                    </SelectItem>
                                                    <SelectItem value="Kas sumber dana tidak cukup tersedia, prioritas belanja wajib rutin bulanan">
                                                        Kas sumber dana tidak cukup tersedia, prioritas belanja wajib rutin bulanan
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {form.formState.errors.keterangan_koreksi && (
                                        <p className="text-red-500 text-sm flex items-center gap-1">
                                            <AlertTriangleIcon className="h-3 w-3" />
                                            {form.formState.errors.keterangan_koreksi.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <DialogFooter>
                    <Button
                        type="submit"
                        form="koreksi-form"
                        className="w-full"
                        variant="destructive"
                        disabled={isSubmitting || !generatedNomorKoreksi || !form.formState.isValid}
                    >
                        {isSubmitting ? 'Memproses...' : 'Proses Pengembalian'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default KoreksiTagihanDialog;
