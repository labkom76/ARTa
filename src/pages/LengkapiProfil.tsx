import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LengkapiProfil = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Lengkapi Profil Anda</h1>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nama_lengkap" className="text-left">
              Nama Lengkap
            </Label>
            <Input
              id="nama_lengkap"
              placeholder="Masukkan nama lengkap Anda"
              className="w-full"
            />
          </div>
          <Button type="button" className="w-full mt-4">
            Simpan dan Lanjutkan
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LengkapiProfil;