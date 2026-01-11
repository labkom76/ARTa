import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileTextIcon, MapPinIcon, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

// Zod schema for form validation
const formSchema = z.object({
    kode_wilayah: z.string().min(1, { message: 'Kode Wilayah wajib diisi.' }),
    nomor_sp2d: z.string().min(1, { message: 'Nomor SP2D wajib diisi.' }),
});

type NomorPerbenFormValues = z.infer<typeof formSchema>;

const AdminNomorPerben = () => {
    const { profile, loading: sessionLoading } = useSession();
    const [loadingPage, setLoadingPage] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<NomorPerbenFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            kode_wilayah: '',
            nomor_sp2d: '04.0', // Default based on user request
        },
    });

    // Fetch settings on component mount
    useEffect(() => {
        const fetchSettings = async () => {
            if (sessionLoading || profile?.peran !== 'Administrator') {
                setLoadingPage(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('app_settings')
                    .select('key, value')
                    .in('key', ['kode_wilayah', 'nomor_sp2d']);

                if (error) throw error;

                if (data && data.length > 0) {
                    const settingsMap = new Map(data.map(item => [item.key, item.value]));
                    form.reset({
                        kode_wilayah: settingsMap.get('kode_wilayah') || '',
                        nomor_sp2d: settingsMap.get('nomor_sp2d') || '04.0',
                    });
                }
            } catch (error: any) {
                console.error('Error fetching settings:', error.message);
                toast.error('Gagal memuat pengaturan: ' + error.message);
            } finally {
                setLoadingPage(false);
            }
        };

        fetchSettings();
    }, [sessionLoading, profile, form]);

    const onSubmit = async (values: NomorPerbenFormValues) => {
        setIsSubmitting(true);
        try {
            // Save both settings
            const updates = [
                { key: 'kode_wilayah', value: values.kode_wilayah },
                { key: 'nomor_sp2d', value: values.nomor_sp2d }
            ];

            const { error } = await supabase
                .from('app_settings')
                .upsert(updates, { onConflict: 'key' });

            if (error) throw error;

            toast.success('Pengaturan Nomor Perben berhasil disimpan!');
        } catch (error: any) {
            console.error('Error saving settings:', error.message);
            toast.error('Gagal menyimpan pengaturan: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingPage) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                            Memuat Halaman
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Sedang memeriksa hak akses...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (profile?.peran !== 'Administrator') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full border-red-200 dark:border-red-900/50 shadow-lg">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                                Akses Ditolak
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Anda tidak memiliki izin untuk mengakses halaman ini.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <BookOpen className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                            Pengaturan Nomor Perben
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            Kelola Kode Wilayah dan Nomor SP2D untuk sistem penomoran
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                            <FileTextIcon className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                            Detail Nomor Perben
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="kode_wilayah" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Kode Wilayah
                                </Label>
                                <div className="relative">
                                    <MapPinIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="kode_wilayah"
                                        {...form.register('kode_wilayah')}
                                        placeholder="Contoh: 75.01"
                                        disabled={isSubmitting}
                                        className="w-full pl-10 border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                                    />
                                </div>
                                {form.formState.errors.kode_wilayah && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {form.formState.errors.kode_wilayah.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="nomor_sp2d" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Nomor SP2D
                                </Label>
                                <div className="relative">
                                    <FileTextIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <Input
                                        id="nomor_sp2d"
                                        {...form.register('nomor_sp2d')}
                                        placeholder="Contoh: 04.0"
                                        disabled={isSubmitting}
                                        className="w-full pl-10 border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                                    />
                                </div>
                                {form.formState.errors.nomor_sp2d && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {form.formState.errors.nomor_sp2d.message}
                                    </p>
                                )}
                                <p className="text-[11px] text-slate-500 mt-1 italic">
                                    * Nomor ini akan menggantikan bagian kedua pada format nomor SP2D.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 rounded-xl h-11 font-bold"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminNomorPerben;
