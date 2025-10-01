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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

const formSchema = z.object({
  nama_lengkap: z.string().min(1, { message: 'Nama Lengkap wajib diisi.' }),
  email: z.string().email({ message: 'Email tidak valid.' }).min(1, { message: 'Email wajib diisi.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
  asal_skpd: z.string().min(1, { message: 'Asal SKPD wajib diisi.' }),
  peran: z.enum(['SKPD', 'Staf Registrasi', 'Staf Verifikator', 'Staf Koreksi', 'Administrator'], {
    required_error: 'Peran wajib dipilih.',
  }),
});

type AddUserFormValues = z.infer<typeof formSchema>;

const AddUserDialog: React.FC<AddUserDialogProps> = ({ isOpen, onClose, onUserAdded }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_lengkap: '',
      email: '',
      password: '',
      asal_skpd: '',
      peran: 'SKPD', // Default role
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset(); // Reset form when dialog closes
    }
  }, [isOpen, form]);

  const onSubmit = async (values: AddUserFormValues) => {
    setIsSubmitting(true);
    try {
      // Langkah A: Buat pengguna baru di sistem Autentikasi Supabase
      const { data, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            nama_lengkap: values.nama_lengkap,
            asal_skpd: values.asal_skpd,
            // Peran awal akan diatur oleh trigger handle_new_user ke 'SKPD'
            // Kita akan memperbarui peran jika berbeda dari default
          },
        },
      });

      if (authError) {
        // Handle specific auth errors, e.g., user already exists
        if (authError.message.includes('already registered')) {
          toast.error('Gagal menambahkan pengguna: Email sudah terdaftar.');
        } else {
          toast.error('Gagal mendaftarkan pengguna: ' + authError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (!data.user) {
        toast.error('Gagal membuat pengguna: Tidak ada data pengguna yang dikembalikan.');
        setIsSubmitting(false);
        return;
      }

      const newUserId = data.user.id;

      // Langkah B: Perbarui peran di tabel profiles jika peran yang dipilih bukan 'SKPD' (default)
      if (values.peran !== 'SKPD') {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ peran: values.peran })
          .eq('id', newUserId);

        if (profileUpdateError) {
          console.error('Error updating profile role:', profileUpdateError);
          // Jika gagal update profil, mungkin perlu menghapus user auth yang baru dibuat
          // Untuk kesederhanaan, kita hanya akan log error dan menampilkan toast
          toast.error('Pengguna berhasil dibuat, tetapi gagal memperbarui peran: ' + profileUpdateError.message);
          setIsSubmitting(false);
          return;
        }
      }

      toast.success('Pengguna baru berhasil ditambahkan!');
      onUserAdded(); // Trigger refresh in parent component
      onClose(); // Close the dialog
    } catch (error: any) {
      console.error('Error adding new user:', error.message);
      toast.error('Terjadi kesalahan saat menambahkan pengguna: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tambah Pengguna Baru</DialogTitle>
          <DialogDescription>
            Masukkan detail pengguna baru di sini. Klik simpan setelah selesai.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nama_lengkap" className="text-right">
              Nama Lengkap
            </Label>
            <Input
              id="nama_lengkap"
              {...form.register('nama_lengkap')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.nama_lengkap && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.nama_lengkap.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.email && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.password && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="asal_skpd" className="text-right">
              Asal SKPD
            </Label>
            <Input
              id="asal_skpd"
              {...form.register('asal_skpd')}
              className="col-span-3"
              disabled={isSubmitting}
            />
            {form.formState.errors.asal_skpd && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.asal_skpd.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="peran" className="text-right">
              Peran
            </Label>
            <Controller
              name="peran"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKPD">SKPD</SelectItem>
                    <SelectItem value="Staf Registrasi">Staf Registrasi</SelectItem>
                    <SelectItem value="Staf Verifikator">Staf Verifikator</SelectItem>
                    <SelectItem value="Staf Koreksi">Staf Koreksi</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.peran && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.peran.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;