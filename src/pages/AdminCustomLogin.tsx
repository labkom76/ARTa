import React, { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UploadIcon } from 'lucide-react';

const AdminCustomLogin = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [randomLayout, setRandomLayout] = useState(false); // State for toggle
  const [formPosition, setFormPosition] = useState('center'); // State for radio group
  const [backgroundEffect, setBackgroundEffect] = useState(false); // State for toggle

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
                  defaultValue="center"
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
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galeri Gambar Panel */}
          <Card className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-semibold">Galeri Gambar</CardTitle>
              <Button variant="outline" className="flex items-center gap-2">
                <UploadIcon className="h-4 w-4" /> Unggah Gambar Baru
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="relative aspect-video overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
                    <img
                      src="/placeholder.svg"
                      alt={`Placeholder Image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <span className="text-white text-sm">Gambar {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomLogin;