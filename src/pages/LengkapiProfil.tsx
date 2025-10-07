import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  nama_lengkap: z.string().min(1, { message: 'Nama Lengkap wajib diisi.' }),
});

type LengkapiProfilFormValues = z.infer<typeof formSchema>;

const LengkapiProfil = () => {
  const { user, profile, role, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LengkapiProfilFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_lengkap: profile?.nama_lengkap || '',
    },
  });

  useEffect(() => {
    if (profile?.nama_lengkap) {
      form.reset({ nama_lengkap: profile.nama_lengkap });
    }
  }, [profile, form]);

  const onSubmit = async (values: LengkapiProfilFormValues) => {
    if (!user) {
      toast.error('Anda harus login untuk melengkapi profil.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nama_lengkap: values.nama_lengkap })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil berhasil diperbarui!');
      
      // Navigate to the appropriate dashboard based on the user's role
      let targetPath = '/';
      switch (role) {
        case 'SKPD':
          targetPath = '/dashboard-skpd';
          break;
        case 'Staf Registrasi':
          targetPath = '/dashboard-registrasi';
          break;
        case 'Staf Verifikator':
          targetPath = '/dashboard-verifikasi';
          break;
        case 'Staf Koreksi':
          targetPath = '/dashboard-koreksi';
          break;
        case 'Administrator':
          targetPath = '/admin/dashboard';
          break;
        default:
          targetPath = '/'; // Fallback to home
          break;
      }
      navigate(targetPath, { replace: true });

    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      toast.error('Gagal memperbarui profil: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
        <p className="text-gray-600 dark:text-gray-400">Memuat profil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Lengkapi Profil Anda</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nama_lengkap" className="text-left">
              Nama Lengkap
            </Label>
            <Input
              id="nama_lengkap"
              placeholder="Masukkan nama lengkap Anda"
              className="w-full"
              {...form.register('nama_lengkap')}
              disabled={isSubmitting}
            />
            {form.formState.errors.nama_lengkap && (
              <p className="text-red-500 text-sm text-left mt-1">
                {form.formState.errors.nama_lengkap.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan dan Lanjutkan'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LengkapiProfil;