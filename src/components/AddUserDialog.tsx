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

interface UserProfile {
  id: string;
  nama_lengkap: string;
  asal_skpd: string | null; // Allow null for asal_skpd
  peran: string;
  email: string;
}

interface AddUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
  editingUser?: UserProfile | null; // New prop for editing
}

const formSchema = z.object({
  nama_lengkap: z.string().min(1, { message: 'Nama Lengkap wajib diisi.' }),
  email: z.string().email({ message: 'Email tidak valid.' }).min(1, { message: 'Email wajib diisi.' }).optional(), // Optional for edit mode
  password: z.string().optional().refine(val => !val || val.length >= 6, { message: 'Password minimal 6 karakter.' }), // Corrected validation
  asal_skpd: z.string().optional(), // Make optional initially
  peran: z.enum(['SKPD', 'Staf Registrasi', 'Staf Verifikator', 'Staf Koreksi', 'Administrator'], {
    required_error: 'Peran wajib dipilih.',
  }),
}).superRefine((data, ctx) => {
  // Conditional validation for asal_skpd based on peran
  if (data.peran === 'SKPD' && (!data.asal_skpd || data.asal_skpd.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Asal SKPD wajib dipilih untuk peran SKPD.',
      path: ['asal_skpd'],
    });
  }
});

type AddUserFormValues = z.infer<typeof formSchema>;

const AddUserDialog: React.FC<AddUserDialogProps> = ({ isOpen, onClose, onUserAdded, editingUser }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skpdOptions, setSkpdOptions] = useState<string[]>([]); // State to store SKPD options

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

  const selectedPeran = form.watch('peran'); // Watch the selected role

  // Fetch SKPD options when dialog opens
  useEffect(() => {
    const fetchSkpdOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('master_skpd')
          .select('nama_skpd')
          .order('nama_skpd', { ascending: true });

        if (error) throw error;
        setSkpdOptions(data.map(item => item.nama_skpd));
      } catch (error: any) {
        console.error('Error fetching SKPD options:', error.message);
        toast.error('Gagal memuat daftar SKPD: ' + error.message);
      }
    };

    if (isOpen) {
      fetchSkpdOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && editingUser) {
      // Set form values for editing
      form.reset({
        nama_lengkap: editingUser.nama_lengkap,
        email: editingUser.email,
        password: '', // Password is not editable, so reset it
        asal_skpd: editingUser.asal_skpd || '', // Handle null asal_skpd
        peran: editingUser.peran as AddUserFormValues['peran'],
      });
    } else if (isOpen && !editingUser) {
      // Reset form for adding new user
      form.reset({
        nama_lengkap: '',
        email: '',
        password: '',
        asal_skpd: '', // Reset to empty string for new user
        peran: 'SKPD',
      });
    }
  }, [isOpen, editingUser, form]);

  // Conditional logic for asal_skpd based on selectedPeran
  useEffect(() => {
    if (selectedPeran !== 'SKPD') {
      form.setValue('asal_skpd', ''); // Clear asal_skpd if role is not SKPD
      form.clearErrors('asal_skpd'); // Clear any validation errors for asal_skpd
    }
  }, [selectedPeran, form]);

  const onSubmit = async (values: AddUserFormValues) => {
    setIsSubmitting(true);
    try {
      // Prepare asal_skpd value: null if not SKPD, otherwise the selected value
      const asalSkpdToSave = values.peran === 'SKPD' ? values.asal_skpd : null;

      if (editingUser) {
        // Mode Edit: Perbarui profil
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            nama_lengkap: values.nama_lengkap,
            asal_skpd: asalSkpdToSave,
            peran: values.peran,
          })
          .eq('id', editingUser.id);

        if (profileUpdateError) {
          console.error('Error updating profile:', profileUpdateError);
          toast.error('Gagal memperbarui profil pengguna: ' + profileUpdateError.message);
          setIsSubmitting(false);
          return;
        }
        toast.success('Profil pengguna berhasil diperbarui!');
      } else {
        // Mode Tambah: Buat pengguna baru di Auth dan perbarui profil
        const { data, error: authError } = await supabase.auth.signUp({
          email: values.email!, // Email wajib diisi untuk signUp
          password: values.password!, // Password wajib diisi untuk signUp
          options: {
            data: {
              nama_lengkap: values.nama_lengkap,
              asal_skpd: asalSkpdToSave, // Pass asal_skpd to auth metadata
              peran: values.peran, // Pass peran to auth metadata
            },
          },
        });

        if (authError) {
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

        // The handle_new_user trigger will insert the initial profile.
        // We need to ensure the 'peran' and 'asal_skpd' are correctly set if they differ from defaults.
        // The trigger currently sets 'peran' to 'SKPD' and uses 'nama_lengkap', 'asal_skpd' from raw_user_meta_data.
        // So, we only need to update if the selected 'peran' is not 'SKPD' or if 'asal_skpd' needs to be null.
        if (values.peran !== 'SKPD' || asalSkpdToSave === null) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({ 
              peran: values.peran,
              asal_skpd: asalSkpdToSave,
            })
            .eq('id', newUserId);

          if (profileUpdateError) {
            console.error('Error updating profile role/skpd:', profileUpdateError);
            toast.error('Pengguna berhasil dibuat, tetapi gagal memperbarui peran/SKPD: ' + profileUpdateError.message);
            setIsSubmitting(false);
            return;
          }
        }
        toast.success('Pengguna baru berhasil ditambahkan!');
      }

      onUserAdded(); // Trigger refresh in parent component
      onClose(); // Close the dialog
    } catch (error: any) {
      console.error('Error saving user:', error.message);
      toast.error('Terjadi kesalahan saat menyimpan pengguna: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = !!editingUser;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Perbarui detail pengguna di sini.' : 'Masukkan detail pengguna baru di sini.'} Klik simpan setelah selesai.
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
              disabled={isSubmitting || isEditMode}
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
              disabled={isSubmitting || isEditMode}
              placeholder={isEditMode ? "Tidak dapat diubah" : "Masukkan password"}
            />
            {form.formState.errors.password && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.password.message}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="asal_skpd" className="text-right">
              Asal SKPD
            </Label>
            <Controller
              name="asal_skpd"
              control={form.control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ''} // Ensure value is string for Select
                  disabled={isSubmitting || selectedPeran !== 'SKPD'} // Disable if not SKPD
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Pilih Asal SKPD" />
                  </SelectTrigger>
                  <SelectContent>
                    {skpdOptions.map((skpd) => (
                      <SelectItem key={skpd} value={skpd}>
                        {skpd}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.asal_skpd && (
              <p className="col-span-4 text-right text-red-500 text-sm">
                {form.formState.errors.asal_skpd.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (editingUser ? 'Memperbarui...' : 'Menyimpan...') : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;