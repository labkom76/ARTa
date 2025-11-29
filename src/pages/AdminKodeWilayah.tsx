import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPinIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

// Zod schema for form validation
const formSchema = z.object({
  kode_wilayah: z.string().min(1, { message: 'Kode Wilayah wajib diisi.' }),
});

type KodeWilayahFormValues = z.infer<typeof formSchema>;

const AdminKodeWilayah = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<KodeWilayahFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      kode_wilayah: '',
    },
  });

  // Fetch kode_wilayah on component mount
  useEffect(() => {
    const fetchKodeWilayah = async () => {
      if (sessionLoading || profile?.peran !== 'Administrator') {
        setLoadingPage(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'kode_wilayah')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
          throw error;
        }

        if (data) {
          form.reset({ kode_wilayah: data.value });
        }
      } catch (error: any) {
        console.error('Error fetching kode_wilayah:', error.message);
        toast.error('Gagal memuat Kode Wilayah: ' + error.message);
      } finally {
        setLoadingPage(false);
      }
    };

    fetchKodeWilayah();
  }, [sessionLoading, profile, form]);

  const onSubmit = async (values: KodeWilayahFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'kode_wilayah', value: values.kode_wilayah }, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Kode Wilayah berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving kode_wilayah:', error.message);
      toast.error('Gagal menyimpan Kode Wilayah: ' + error.message);
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
            <MapPinIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Pengaturan Kode Wilayah
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola kode wilayah yang digunakan dalam aplikasi
            </p>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
              <MapPinIcon className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Kode Wilayah
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="kode_wilayah" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Kode Wilayah
              </Label>
              <Input
                id="kode_wilayah"
                {...form.register('kode_wilayah')}
                placeholder="Masukkan kode wilayah..."
                disabled={isSubmitting}
                className="w-full border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
              />
              {form.formState.errors.kode_wilayah && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.kode_wilayah.message}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Kode Wilayah'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminKodeWilayah;