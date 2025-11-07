import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UploadIcon, Trash2Icon, ImageOffIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea

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
    if (!window.confirm('Apakah Anda yakin ingin menghapus gambar ini?')) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from('login-backgrounds')
        .remove([imageName]);

      if (error) throw error;

      // If the deleted image was the currently selected background, clear it
      const { data: publicUrlData } = supabase.storage.from('login-backgrounds').getPublicUrl(imageName);
      if (selectedBackgroundUrl === publicUrlData.publicUrl) {
        await updateSetting('login_background_url', ''); // Use updateSetting for consistency
        setSelectedBackgroundUrl(null);
      }

      toast.success('Gambar berhasil dihapus!');
      fetchBackgroundImages();
    } catch (error: any) {
      console.error('Error deleting image:', error.message);
      toast.error('Gagal menghapus gambar: ' + error.message);
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

  const handleRemoveLogo = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus logo ini?')) {
      return;
    }
    try {
      if (appLogoUrl) {
        const fileName = appLogoUrl.split('/').pop();
        if (fileName) {
          await supabase.storage.from('branding').remove([fileName]);
        }
      }
      await updateSetting('app_logo_url', '');
      setAppLogoUrl(null);
      toast.success('Logo aplikasi berhasil dihapus!');
    } catch (error: any) {
      console.error('Error removing logo:', error.message);
      toast.error('Gagal menghapus logo: ' + error.message);
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


  if (sessionLoading || loadingBranding) {
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Kustomisasi Halaman Login</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Di sini Anda dapat mengelola pengaturan tampilan dan fungsionalitas halaman login. Perubahan akan disimpan secara otomatis.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pengaturan Branding Card (New Card) */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pengaturan Branding</CardTitle>
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

          {/* NEW: Pengaturan Papan Informasi Card */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pengaturan Papan Informasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="announcement-visibility">Tampilkan Papan Informasi</Label>
                <Switch
                  id="announcement-visibility"
                  checked={announcementVisibility}
                  onCheckedChange={(checked) => {
                    setAnnouncementVisibility(checked); // Update local state
                    updateSetting('announcement_visibility', String(checked)); // Persist to database immediately
                  }}
                  aria-label="Toggle announcement board visibility"
                  className="data-[state=checked]:bg-green-500"
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
                {/* Helper text for Markdown */}
                <p className="text-xs text-muted-foreground">Gunakan format Markdown (misal: `**bold**`, `*italic*`, `1. list item`).</p>
              </div>
              <Button onClick={handleSaveAnnouncementSettings} disabled={isSavingAnnouncement} className="w-full">
                {isSavingAnnouncement ? 'Menyimpan...' : 'Simpan Pengaturan Papan Informasi'}
              </Button>
            </CardContent>
          </Card>

          {/* Pengaturan Tata Letak Card */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pengaturan Tata Letak</CardTitle>
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
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label>Posisi Form Login:</Label>
                <RadioGroup
                  value={formPosition}
                  onValueChange={(value) => {
                    setFormPosition(value);
                    updateSetting('login_form_position', value);
                  }}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="left" id="form-left" />
                    <Label htmlFor="form-left">Form di Kiri</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="center" id="form-center" />
                    <Label htmlFor="form-center">Form di Tengah</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="right" id="form-right" />
                    <Label htmlFor="form-right">Form di Kanan</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Efek Latar Belakang Card */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Efek Latar Belakang</CardTitle>
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
                  className="data-[state=checked]:bg-green-500"
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
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pengaturan Tampilan Form Card */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pengaturan Tampilan Form</CardTitle>
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
                  className="data-[state=checked]:bg-green-500"
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
                  className="data-[state=checked]:bg-green-500"
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
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galeri Gambar Panel */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">Galeri Gambar</CardTitle>
              <div className="flex items-center space-x-4"> {/* Container for switch and upload button */}
                <div className="flex items-center space-x-2">
                  <Label htmlFor="enable-slider">Aktifkan Slider Gambar</Label>
                  <Switch
                    id="enable-slider"
                    checked={enableSlider}
                    onCheckedChange={(checked) => {
                      setEnableSlider(checked);
                      updateSetting('login_background_slider', String(checked));
                    }}
                    aria-label="Toggle background image slider"
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" className="flex items-center gap-2" onClick={() => document.getElementById('file-upload')?.click()}>
                  <UploadIcon className="h-4 w-4" /> Unggah Gambar Baru
                </Button>
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
                        (selectedBackgroundUrl === image.url ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700')
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
                            e.stopPropagation(); // Prevent selecting image when deleting
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
      </div>
    </div>
  );
};

export default AdminCustomLogin;