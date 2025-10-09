import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Administrator') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pengaturan Kode Wilayah</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Kelola kode wilayah yang digunakan dalam aplikasi.
      </p>

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Kode Wilayah</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kode_wilayah" className="text-right">
                Kode Wilayah
              </Label>
              <Input
                id="kode_wilayah"
                {...form.register('kode_wilayah')}
                className="col-span-3"
                disabled={isSubmitting}
              />
              {form.formState.errors.kode_wilayah && (
                <p className="col-span-4 text-right text-red-500 text-sm">
                  {form.formState.errors.kode_wilayah.message}
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminKodeWilayah;