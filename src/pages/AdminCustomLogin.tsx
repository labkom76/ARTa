import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminCustomLogin = () => {
  const { profile, loading: sessionLoading } = useSession();

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

      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Pengaturan Kustom Login</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Konten kustomisasi halaman login akan ditambahkan di sini.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCustomLogin;