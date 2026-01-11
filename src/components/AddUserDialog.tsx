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
import { Combobox } from '@/components/ui/combobox'; // Import the new Combobox

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
  peran: z.enum(['SKPD', 'Staf Registrasi', 'Staf Verifikator', 'Staf Koreksi', 'Register SP2D', 'Administrator'], {
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
  const [skpdOptions, setSkpdOptions] = useState<{ value: string; label: string }[]>([]); // State to store SKPD options in Combobox format

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
        // Map to { value: string, label: string } format for Combobox
        setSkpdOptions(data.map(item => ({ value: item.nama_skpd, label: item.nama_skpd })));
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 -m-6 mb-0 p-6 rounded-t-lg">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            {isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {isEditMode ? 'Perbarui detail pengguna di sini' : 'Masukkan detail pengguna baru di sini'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="nama_lengkap" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nama Lengkap
            </Label>
            <Input
              id="nama_lengkap"
              {...form.register('nama_lengkap')}
              className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
              disabled={isSubmitting}
            />
            {form.formState.errors.nama_lengkap && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.nama_lengkap.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register('email')}
              className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
              disabled={isSubmitting || isEditMode}
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              {...form.register('password')}
              className="border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500"
              disabled={isSubmitting || isEditMode}
              placeholder={isEditMode ? "Tidak dapat diubah" : "Masukkan password"}
            />
            {form.formState.errors.password && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="peran" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Peran
            </Label>
            <Controller
              name="peran"
              control={form.control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger className="border-slate-300 dark:border-slate-700">
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SKPD">SKPD</SelectItem>
                    <SelectItem value="Staf Registrasi">Staf Registrasi</SelectItem>
                    <SelectItem value="Staf Verifikator">Staf Verifikator</SelectItem>
                    <SelectItem value="Staf Koreksi">Staf Koreksi</SelectItem>
                    <SelectItem value="Register SP2D">Register SP2D</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.peran && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.peran.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="asal_skpd" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Asal SKPD
            </Label>
            <Controller
              name="asal_skpd"
              control={form.control}
              render={({ field }) => (
                <Combobox
                  options={skpdOptions}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  placeholder="Pilih Asal SKPD"
                  disabled={isSubmitting || selectedPeran !== 'SKPD'}
                  className="w-full border-slate-300 dark:border-slate-700"
                />
              )}
            />
            {form.formState.errors.asal_skpd && (
              <p className="text-red-500 text-sm">
                {form.formState.errors.asal_skpd.message}
              </p>
            )}
          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting ? (editingUser ? 'Memperbarui...' : 'Menyimpan...') : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;