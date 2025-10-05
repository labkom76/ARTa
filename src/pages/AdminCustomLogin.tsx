import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UploadIcon, Trash2Icon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input'; // Import Input for file upload

const AdminCustomLogin = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [randomLayout, setRandomLayout] = useState(false);
  const [formPosition, setFormPosition] = useState('center');
  const [backgroundEffect, setBackgroundEffect] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<{ name: string; url: string }[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = new Map(data.map(item => [item.key, item.value]));

      setRandomLayout(settingsMap.get('login_layout_random') === 'true');
      setFormPosition(settingsMap.get('login_form_position') || 'center');
      setBackgroundEffect(settingsMap.get('login_background_effect') === 'true');
      setSelectedBackgroundUrl(settingsMap.get('login_background_url') || null);
    } catch (error: any) {
      console.error('Error fetching settings:', error.message);
      toast.error('Gagal memuat pengaturan login: ' + error.message);
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
    const fileName = `${Date.now()}-${file.name}`; // Unique file name

    try {
      const { error } = await supabase.storage
        .from('login-backgrounds')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      toast.success('Gambar berhasil diunggah!');
      fetchBackgroundImages(); // Refresh the image list
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
        await supabase.from('app_settings').update({ value: '' }).eq('key', 'login_background_url');
        setSelectedBackgroundUrl(null);
      }

      toast.success('Gambar berhasil dihapus!');
      fetchBackgroundImages(); // Refresh the image list
    } catch (error: any) {
      console.error('Error deleting image:', error.message);
      toast.error('Gagal menghapus gambar: ' + error.message);
    }
  };

  const handleSelectImage = async (imageUrl: string) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: imageUrl })
        .eq('key', 'login_background_url');

      if (error) throw error;

      setSelectedBackgroundUrl(imageUrl);
      toast.success('Gambar latar belakang login berhasil diperbarui!');
    } catch (error: any) {
      console.error('Error setting background image:', error.message);
      toast.error('Gagal mengatur gambar latar belakang: ' + error.message);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const settingsToUpdate = [
        { key: 'login_layout_random', value: String(randomLayout) },
        { key: 'login_form_position', value: formPosition },
        { key: 'login_background_effect', value: String(backgroundEffect) },
      ];

      const { error } = await supabase
        .from('app_settings')
        .upsert(settingsToUpdate, { onConflict: 'key' });

      if (error) throw error;

      toast.success('Pengaturan login berhasil disimpan!');
    } catch (error: any) {
      console.error('Error saving settings:', error.message);
      toast.error('Gagal menyimpan pengaturan login: ' + error.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (sessionLoading) {
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
        Di sini Anda dapat mengelola pengaturan tampilan dan fungsionalitas halaman login.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pengaturan Tata Letak Card */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Pengaturan Tata Letak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="random-layout">Acak Tata Letak</Label>
                <Toggle
                  id="random-layout"
                  pressed={randomLayout}
                  onPressedChange={setRandomLayout}
                  aria-label="Toggle random layout"
                />
              </div>
              <div className="space-y-2">
                <Label>Posisi Form Login:</Label>
                <RadioGroup
                  value={formPosition}
                  onValueChange={setFormPosition}
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
            <CardContent className="flex items-center justify-between">
              <Label htmlFor="background-effect">Aktifkan Efek Latar</Label>
              <Toggle
                id="background-effect"
                pressed={backgroundEffect}
                onPressedChange={setBackgroundEffect}
                aria-label="Toggle background effect"
              />
            </CardContent>
          </Card>
          <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full">
            {isSavingSettings ? 'Menyimpan...' : 'Simpan Perubahan Pengaturan'}
          </Button>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galeri Gambar Panel */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">Galeri Gambar</CardTitle>
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