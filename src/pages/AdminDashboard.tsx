import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboardIcon, UsersIcon, FileTextIcon, CheckCircleIcon } from 'lucide-react';

const AdminDashboard = () => {
  const { profile, loading: sessionLoading } = useSession();
  const [loadingPage, setLoadingPage] = useState(true);

  useEffect(() => {
    if (!sessionLoading) {
      setLoadingPage(false);
    }
  }, [sessionLoading]);

  // Static data for layout purposes
  const staticCardData = [
    { title: 'Total Pengguna', value: '120', icon: UsersIcon, color: 'text-blue-500' },
    { title: 'Tagihan Menunggu Registrasi', value: '15', icon: FileTextIcon, color: 'text-yellow-500' },
    { title: 'Tagihan Menunggu Verifikasi', value: '8', icon: FileTextIcon, color: 'text-purple-500' },
    { title: 'Tagihan Selesai Hari Ini', value: '30', icon: CheckCircleIcon, color: 'text-green-500' },
  ];

  const staticBarChartData = [
    { name: 'Input SKPD', value: 100 },
    { name: 'Registrasi', value: 80 },
    { name: 'Verifikasi', value: 60 },
    { name: 'Selesai', value: 40 },
  ];

  if (loadingPage) {
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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Administrator</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Selamat datang, {profile?.nama_lengkap || 'Administrator'}! Ini adalah ringkasan aktivitas sistem.
      </p>

      {/* Kotak Informasi (Cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {staticCardData.map((item, index) => (
          <Card key={index} className="shadow-sm rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <item.icon className={ `h-4 w-4 ${item.color}` } />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground">Data statis</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grafik Batang (Bar Chart) */}
      <Card className="shadow-sm rounded-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <LayoutDashboardIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            Status Alur Kerja Langsung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={staticBarChartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;