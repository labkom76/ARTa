import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UploadIcon, Trash2Icon, ImageOffIcon, SettingsIcon, PaletteIcon, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';

// Utility function to sanitize file names
const sanitizeFileName = (name: string): string => {
  // Replace any character that is not alphanumeric, hyphen, underscore, or period with an empty string
  let sanitized = name.replace(/[^a-zA-Z0-9-._]/g, '');
  // Replace multiple hyphens with a single hyphen
  sanitized = sanitized.replace(/-+/g, '-');
  // Trim leading/trailing hyphens or periods
  sanitized = sanitized.replace(/^[.-]+|[.-]+$/g, '');
  // Ensure it's not empty after sanitization
  if (sanitized === '') {
    return `untitled-${Date.now()}`; // Fallback name with timestamp
  }
  return sanitized;
};

const AdminCustomLogin = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [randomLayout, setRandomLayout] = useState(false);
  const [formPosition, setFormPosition] = useState('center');
  const [backgroundEffect, setBackgroundEffect] = useState(false);
  const [enableSlider, setEnableSlider] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [showForgotPasswordLink, setShowForgotPasswordLink] = useState(true);
  const [showSignupLink, setShowSignupLink] = useState(true);
  const [showEmailPasswordLogin, setShowEmailPasswordLogin] = useState(true);
  const [backgroundImages, setBackgroundImages] = useState<{ name: string; url: string }[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string | null>(null);

  // New states for branding
  const [appName, setAppName] = useState('Aplikasi Tagihan');
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appSubtitle1, setAppSubtitle1] = useState('(Aplikasi Registrasi Tagihan)'); // New state for subtitle 1
  const [appSubtitle2, setAppSubtitle2] = useState('Pemerintah Daerah Kabupaten Gorontalo'); // New state for subtitle 2
  const [loadingBranding, setLoadingBranding] = useState(true);

  // NEW STATES FOR ANNOUNCEMENT BOARD
  const [announcementVisibility, setAnnouncementVisibility] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // NEW STATES FOR BACKGROUND QUOTES
  const [backgroundQuote1, setBackgroundQuote1] = useState('');
  const [backgroundQuote2, setBackgroundQuote2] = useState('');
  const [backgroundQuote3, setBackgroundQuote3] = useState('');
  const [isSavingQuotes, setIsSavingQuotes] = useState(false);

  // DELETE CONFIRMATION DIALOG STATES
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'image' | 'logo', name?: string } | null>(null);


  // Generic function to update a setting in app_settings table
  const updateSetting = useCallback(async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Pengaturan disimpan!');
    } catch (error: any) {
      console.error(`Error saving setting ${key}:`, error.message);
      toast.error('Gagal menyimpan pengaturan: ' + error.message);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoadingBranding(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = new Map(data.map(item => [item.key, item.value]));

      setRandomLayout(settingsMap.get('login_layout_random') === 'true');
      setFormPosition(settingsMap.get('login_form_position') || 'center');
      setBackgroundEffect(settingsMap.get('login_background_effect') === 'true');
      setEnableSlider(settingsMap.get('login_background_slider') === 'true');
      setBackgroundBlur(settingsMap.get('login_background_blur') === 'true');
      setShowForgotPasswordLink(settingsMap.get('login_show_forgot_password') === 'true');
      setShowSignupLink(settingsMap.get('login_show_signup') === 'true');
      setShowEmailPasswordLogin(settingsMap.get('login_show_email_password') === 'true');
      setSelectedBackgroundUrl(settingsMap.get('login_background_url') || null);

      // Fetch branding settings
      setAppName(settingsMap.get('app_name') || 'Aplikasi Tagihan');
      setAppLogoUrl(settingsMap.get('app_logo_url') || null);
      setAppSubtitle1(settingsMap.get('app_subtitle_1') || '(Aplikasi Registrasi Tagihan)'); // Set subtitle 1
      setAppSubtitle2(settingsMap.get('app_subtitle_2') || 'Pemerintah Daerah Kabupaten Gorontalo'); // Set subtitle 2

      // NEW: Fetch announcement settings
      setAnnouncementVisibility(settingsMap.get('announcement_visibility') === 'true');
      setAnnouncementContent(settingsMap.get('announcement_content') || '');

      // NEW: Fetch background quotes
      setBackgroundQuote1(settingsMap.get('background_quote_1') || '');
      setBackgroundQuote2(settingsMap.get('background_quote_2') || '');
      setBackgroundQuote3(settingsMap.get('background_quote_3') || '');

    } catch (error: any) {
      console.error('Error fetching settings:', error.message);
      toast.error('Gagal memuat pengaturan login: ' + error.message);
    } finally {
      setLoadingBranding(false);
    }
  }, []);

  const fetchBackgroundImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const { data, error } = await supabase.storage.from('login-backgrounds').list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        throw error;
      }

      const imageUrls = data
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const { data: publicUrlData } = supabase.storage.from('login-backgrounds').getPublicUrl(file.name);
          return { name: file.name, url: publicUrlData.publicUrl };
        });

      setBackgroundImages(imageUrls);
    } catch (error: any) {
      console.error('Error fetching background images:', error.message);
      toast.error('Gagal memuat gambar latar belakang: ' + error.message);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchBackgroundImages();
  }, [fetchSettings, fetchBackgroundImages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast.error('Pilih file untuk diunggah.');
      return;
    }

    const file = event.target.files[0];
    const sanitizedOriginalFileName = sanitizeFileName(file.name);
    const fileName = `${Date.now()}-${sanitizedOriginalFileName}`;

    try {
      const { error } = await supabase.storage
        .from('login-backgrounds')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      toast.success('Gambar berhasil diunggah!');
      fetchBackgroundImages();
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      toast.error('Gagal mengunggah gambar: ' + error.message);
    }
  };

  const handleDeleteImage = async (imageName: string) => {
    setDeleteTarget({ type: 'image', name: imageName });
    setIsDeleteDialogOpen(true);
  };

  const handleRemoveLogo = async () => {
    setDeleteTarget({ type: 'logo' });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'image' && deleteTarget.name) {
        const { error } = await supabase.storage
          .from('login-backgrounds')
          .remove([deleteTarget.name]);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage.from('login-backgrounds').getPublicUrl(deleteTarget.name);
        if (selectedBackgroundUrl === publicUrlData.publicUrl) {
          await updateSetting('login_background_url', '');
          setSelectedBackgroundUrl(null);
        }

        toast.success('Gambar berhasil dihapus!');
        fetchBackgroundImages();
      } else if (deleteTarget.type === 'logo') {
        if (appLogoUrl) {
          const fileName = appLogoUrl.split('/').pop();
          if (fileName) {
            await supabase.storage.from('branding').remove([fileName]);
          }
        }
        await updateSetting('app_logo_url', '');
        setAppLogoUrl(null);
        toast.success('Logo aplikasi berhasil dihapus!');
      }
    } catch (error: any) {
      console.error('Error deleting:', error.message);
      toast.error('Gagal menghapus: ' + error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSelectImage = async (imageUrl: string) => {
    try {
      await updateSetting('login_background_url', imageUrl); // Use updateSetting
      setSelectedBackgroundUrl(imageUrl);
      toast.success('Gambar latar belakang login berhasil diperbarui!');
    } catch (error: any) {
      console.error('Error setting background image:', error.message);
      toast.error('Gagal mengatur gambar latar belakang: ' + error.message);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast.error('Pilih file logo untuk diunggah.');
      return;
    }

    const file = event.target.files[0];
    const fileName = `app_logo_${Date.now()}.${file.name.split('.').pop()}`; // Unique filename

    try {
      // Delete old logo if exists
      if (appLogoUrl) {
        const oldFileName = appLogoUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('branding').remove([oldFileName]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('branding').getPublicUrl(fileName);
      await updateSetting('app_logo_url', publicUrlData.publicUrl);
      setAppLogoUrl(publicUrlData.publicUrl);
      toast.success('Logo aplikasi berhasil diunggah!');
    } catch (error: any) {
      console.error('Error uploading logo:', error.message);
      toast.error('Gagal mengunggah logo: ' + error.message);
    }
  };



  // NEW: Function to save announcement settings
  const handleSaveAnnouncementSettings = async () => {
    setIsSavingAnnouncement(true);
    try {
      // announcementVisibility sudah disimpan otomatis oleh switch, jadi hanya simpan content
      await updateSetting('announcement_content', announcementContent);
      toast.success('Pengaturan papan informasi berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving announcement settings:', error.message);
      toast.error('Gagal menyimpan pengaturan papan informasi: ' + error.message);
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // NEW: Function to save background quotes
  const handleSaveBackgroundQuotes = async () => {
    setIsSavingQuotes(true);
    try {
      await updateSetting('background_quote_1', backgroundQuote1);
      await updateSetting('background_quote_2', backgroundQuote2);
      await updateSetting('background_quote_3', backgroundQuote3);
      toast.success('Background quotes berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving background quotes:', error.message);
      toast.error('Gagal menyimpan background quotes: ' + error.message);
    } finally {
      setIsSavingQuotes(false);
    }
  };


  if (sessionLoading || loadingBranding) {
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
            <SettingsIcon className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
              Kustomisasi Halaman Login
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola pengaturan tampilan dan fungsionalitas halaman login
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid - 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Pengaturan Branding Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <PaletteIcon className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Pengaturan Branding
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="app-name">Nama Aplikasi</Label>
                <Input
                  id="app-name"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  onBlur={() => updateSetting('app_name', appName)}
                  placeholder="Masukkan nama aplikasi"
                />
              </div>
              {/* New: Subtitle Baris 1 */}
              <div className="grid gap-2">
                <Label htmlFor="app-subtitle-1">Subtitle Baris 1</Label>
                <Textarea // Changed to Textarea
                  id="app-subtitle-1"
                  value={appSubtitle1}
                  onChange={(e) => setAppSubtitle1(e.target.value)}
                  onBlur={() => updateSetting('app_subtitle_1', appSubtitle1)}
                  placeholder="Masukkan subtitle baris 1"
                  rows={2} // Added rows prop
                />
                <p className="text-xs text-muted-foreground">Gunakan `**teks**` untuk menebalkan huruf.</p> {/* Helper text */}
              </div>
              {/* New: Subtitle Baris 2 */}
              <div className="grid gap-2">
                <Label htmlFor="app-subtitle-2">Subtitle Baris 2</Label>
                <Textarea // Changed to Textarea
                  id="app-subtitle-2"
                  value={appSubtitle2}
                  onChange={(e) => setAppSubtitle2(e.target.value)}
                  onBlur={() => updateSetting('app_subtitle_2', appSubtitle2)}
                  placeholder="Masukkan subtitle baris 2"
                  rows={2} // Added rows prop
                />
                <p className="text-xs text-muted-foreground">Gunakan `**teks**` untuk menebalkan huruf.</p> {/* Helper text */}
              </div>
              <div className="grid gap-2">
                <Label>Logo Aplikasi</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button variant="outline" className="flex-1 flex items-center gap-2" onClick={() => document.getElementById('logo-upload')?.click()}>
                    <UploadIcon className="h-4 w-4" /> Unggah Logo Baru
                  </Button>
                  {appLogoUrl && (
                    <Button variant="destructive" size="icon" onClick={handleRemoveLogo} title="Hapus Logo">
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {appLogoUrl ? (
                  <div className="mt-2 flex justify-center items-center border rounded-md p-2 h-24">
                    <img src={appLogoUrl} alt="App Logo" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="mt-2 flex justify-center items-center border rounded-md p-2 h-24 text-muted-foreground">
                    <ImageOffIcon className="h-8 w-8 mr-2" /> Tidak ada logo
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pengaturan Tata Letak Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <SettingsIcon className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Pengaturan Tata Letak
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="random-layout">Acak Tata Letak</Label>
                <Switch
                  id="random-layout"
                  checked={randomLayout}
                  onCheckedChange={(checked) => {
                    setRandomLayout(checked);
                    updateSetting('login_layout_random', String(checked));
                  }}
                  aria-label="Toggle random layout"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="grid gap-2">
                <Label>Posisi Form Login:</Label>
                <RadioGroup
                  value={formPosition}
                  onValueChange={(value) => {
                    setFormPosition(value);
                    updateSetting('login_form_position', value);
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="form-right" />
                    <Label htmlFor="form-right" className="font-normal cursor-pointer">
                      Form di Kiri
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="form-center" />
                    <Label htmlFor="form-center" className="font-normal cursor-pointer">
                      Form di Tengah
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="form-left" />
                    <Label htmlFor="form-left" className="font-normal cursor-pointer">
                      Form di Kanan
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Pengaturan Tampilan Form Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Pengaturan Tampilan Form
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-forgot-password-link">Tampilkan Tombol Lupa Password</Label>
                <Switch
                  id="show-forgot-password-link"
                  checked={showForgotPasswordLink}
                  onCheckedChange={(checked) => {
                    setShowForgotPasswordLink(checked);
                    updateSetting('login_show_forgot_password', String(checked));
                  }}
                  aria-label="Toggle forgot password link"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-signup-link">Tampilkan Tombol Daftar Akun Baru</Label>
                <Switch
                  id="show-signup-link"
                  checked={showSignupLink}
                  onCheckedChange={(checked) => {
                    setShowSignupLink(checked);
                    updateSetting('login_show_signup', String(checked));
                  }}
                  aria-label="Toggle signup link"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-email-password-login">Tampilkan login dengan Email/Password</Label>
                <Switch
                  id="show-email-password-login"
                  checked={showEmailPasswordLogin}
                  onCheckedChange={(checked) => {
                    setShowEmailPasswordLogin(checked);
                    updateSetting('login_show_email_password', String(checked));
                  }}
                  aria-label="Toggle email/password login form"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pengaturan Papan Informasi Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Pengaturan Papan Informasi
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="announcement-visibility">Tampilkan Papan Informasi</Label>
                <Switch
                  id="announcement-visibility"
                  checked={announcementVisibility}
                  onCheckedChange={(checked) => {
                    setAnnouncementVisibility(checked);
                    updateSetting('announcement_visibility', String(checked));
                  }}
                  aria-label="Toggle announcement board visibility"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="announcement-content">Konten Papan Informasi</Label>
                <Textarea
                  id="announcement-content"
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  placeholder="Masukkan pesan yang akan ditampilkan di papan informasi..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">Gunakan format Markdown (misal: `**bold**`, `*italic*`, `1. list item`).</p>
              </div>
              <Button
                onClick={handleSaveAnnouncementSettings}
                disabled={isSavingAnnouncement}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSavingAnnouncement ? 'Menyimpan...' : 'Simpan Pengaturan Papan Informasi'}
              </Button>
            </CardContent>
          </Card>

          {/* Pengaturan Background Quotes Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Background Quotes Split Screen
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Kelola quotes yang ditampilkan di hero section split screen login (Form di Kiri/Kanan)
              </p>

              <div className="grid gap-2">
                <Label htmlFor="background-quote-1">Quote 1</Label>
                <Textarea
                  id="background-quote-1"
                  value={backgroundQuote1}
                  onChange={(e) => setBackgroundQuote1(e.target.value)}
                  placeholder="Masukkan quote pertama..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="background-quote-2">Quote 2</Label>
                <Textarea
                  id="background-quote-2"
                  value={backgroundQuote2}
                  onChange={(e) => setBackgroundQuote2(e.target.value)}
                  placeholder="Masukkan quote kedua..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="background-quote-3">Quote 3</Label>
                <Textarea
                  id="background-quote-3"
                  value={backgroundQuote3}
                  onChange={(e) => setBackgroundQuote3(e.target.value)}
                  placeholder="Masukkan quote ketiga..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button
                onClick={handleSaveBackgroundQuotes}
                disabled={isSavingQuotes}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSavingQuotes ? 'Menyimpan...' : 'Simpan Background Quotes'}
              </Button>
            </CardContent>
          </Card>


          {/* Efek Latar Belakang Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Efek Latar Belakang
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="background-effect">Aktifkan Efek Latar</Label>
                <Switch
                  id="background-effect"
                  checked={backgroundEffect}
                  onCheckedChange={(checked) => {
                    setBackgroundEffect(checked);
                    updateSetting('login_background_effect', String(checked));
                  }}
                  aria-label="Toggle background effect"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="background-blur">Aktifkan Efek Blur Latar</Label>
                <Switch
                  id="background-blur"
                  checked={backgroundBlur}
                  onCheckedChange={(checked) => {
                    setBackgroundBlur(checked);
                    updateSetting('login_background_blur', String(checked));
                  }}
                  aria-label="Toggle background blur effect"
                  className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Width Section - Galeri Gambar */}
      <div className="mt-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <ImageIcon className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Galeri Gambar
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="enable-slider" className="text-sm">Aktifkan Slider</Label>
                  <Switch
                    id="enable-slider"
                    checked={enableSlider}
                    onCheckedChange={(checked) => {
                      setEnableSlider(checked);
                      updateSetting('login_background_slider', String(checked));
                    }}
                    aria-label="Toggle background image slider"
                    className="data-[state=checked]:bg-emerald-500 dark:data-[state=checked]:bg-emerald-600"
                  />
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-600 dark:hover:bg-emerald-950 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <UploadIcon className="h-4 w-4" /> Unggah Gambar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingImages ? (
              <p className="text-center text-gray-600 dark:text-gray-400">Memuat gambar...</p>
            ) : backgroundImages.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">Tidak ada gambar latar belakang ditemukan.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {backgroundImages.map((image, index) => (
                  <div
                    key={image.name}
                    className={
                      `relative aspect-video overflow-hidden rounded-md border-2 cursor-pointer group ` +
                      (selectedBackgroundUrl === image.url ? 'border-emerald-500 ring-2 ring-emerald-500' : 'border-slate-200 dark:border-slate-700')
                    }
                    onClick={() => handleSelectImage(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={`Background Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(image.name);
                        }}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title={deleteTarget?.type === 'logo' ? 'Hapus Logo' : 'Hapus Gambar'}
        message={
          deleteTarget?.type === 'logo'
            ? 'Apakah Anda yakin ingin menghapus logo ini? Tindakan ini tidak dapat dibatalkan.'
            : 'Apakah Anda yakin ingin menghapus gambar ini? Tindakan ini tidak dapat dibatalkan.'
        }
      />
    </div>
  );
};

export default AdminCustomLogin;