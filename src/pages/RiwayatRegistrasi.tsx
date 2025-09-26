import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const RiwayatRegistrasi = () => {
  const { profile, loading: sessionLoading } = useSession();

  if (sessionLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Memuat Halaman...</h1>
        <p className="text-gray-600 dark:text-gray-400">Sedang memeriksa hak akses Anda.</p>
      </div>
    );
  }

  if (profile?.peran !== 'Staf Registrasi') {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">Akses Ditolak</h1>
        <p className="text-gray-600 dark:text-gray-400">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Riwayat Registrasi Tagihan</h1>

      {/* Area Kontrol Filter (akan diisi nanti) */}
      <div className="mb-6 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center text-gray-500 dark:text-gray-400">
        Area Kontrol Filter (akan diisi nanti)
      </div>

      {/* Kerangka Tabel Kosong */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu Registrasi</TableHead>
              <TableHead>Nomor Registrasi</TableHead>
              <TableHead>Nomor SPM</TableHead>
              <TableHead>Nama SKPD</TableHead>
              <TableHead>Jumlah Kotor</TableHead>
              <TableHead>Status Tagihan</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Baris data akan ditambahkan di sini nanti */}
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Tidak ada data riwayat registrasi.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RiwayatRegistrasi;