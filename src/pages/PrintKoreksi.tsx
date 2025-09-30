import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { QrCodeIcon, XIcon } from 'lucide-react'; // Menggunakan QrCodeIcon dan XIcon

interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  jenis_spm: string;
  jenis_tagihan: string;
  uraian: string;
  jumlah_kotor: number;
  status_tagihan: string;
  waktu_input: string;
  id_pengguna_input: string;
  nomor_registrasi?: string;
  waktu_registrasi?: string;
  nama_registrator?: string;
  catatan_verifikator?: string;
  waktu_verifikasi?: string; // Digunakan untuk waktu koreksi di riwayat
  detail_verifikasi?: { item: string; memenuhi_syarat: boolean; keterangan: string }[];
  nomor_verifikasi?: string; // Digunakan untuk nomor koreksi di riwayat
  nama_verifikator?: string; // Ini akan menjadi nama korektor
  nomor_koreksi?: string;
  id_korektor?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
}

const PrintKoreksi = () => {
  const location = useLocation();
  const [tagihan, setTagihan] = useState<Tagihan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tagihanId = params.get('id');

    if (!tagihanId) {
      setError('ID Tagihan tidak ditemukan di URL.');
      setLoading(false);
      return;
    }

    const fetchTagihanData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('database_tagihan')
          .select('*')
          .eq('id_tagihan', tagihanId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Data tagihan tidak ditemukan.');

        setTagihan(data as Tagihan);
      } catch (err: any) {
        console.error('Error fetching tagihan for print:', err.message);
        setError('Gagal memuat data tagihan: ' + err.message);
        toast.error('Gagal memuat data tagihan untuk cetak.');
      } finally {
        setLoading(false);
      }
    };

    fetchTagihanData();
  }, [location.search]);

  useEffect(() => {
    if (!loading && !error && tagihan) {
      // Beri sedikit jeda agar konten sempat dirender sebelum mencetak
      const timer = setTimeout(() => {
        window.print();
        // Opsional: tutup jendela setelah mencetak
        // window.close(); 
      }, 1000); 
      return () => clearTimeout(timer);
    }
  }, [loading, error, tagihan]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd MMMM yyyy / HH:mm:ss', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'Rp0,00';
    return `Rp${amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-700">Memuat lembar koreksi...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  if (!tagihan) {
    return <div className="p-8 text-center text-gray-700">Data tagihan tidak tersedia.</div>;
  }

  return (
    <div className="font-sans text-black bg-white p-8 mx-auto max-w-3xl print:p-0 print:mx-0 print:w-auto">
      <style>
        {`
        @page {
          size: A4;
          margin: 2cm;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .print-table th, .print-table td {
          border: 1px solid black;
          padding: 4px 8px;
          font-size: 10pt;
          vertical-align: top;
        }
        .print-table th {
          background-color: #f0f0f0;
          text-align: center;
        }
        .print-text-sm {
          font-size: 10pt;
        }
        .print-text-md {
          font-size: 11pt;
        }
        .print-text-lg {
          font-size: 12pt;
        }
        .print-font-bold {
          font-weight: bold;
        }
        .print-mt-4 { margin-top: 16px; }
        .print-mb-2 { margin-bottom: 8px; }
        .print-mb-4 { margin-bottom: 16px; }
        .print-mb-8 { margin-bottom: 32px; }
        .print-leading-relaxed { line-height: 1.625; }
        .print-w-1\/2 { width: 50%; }
        .print-w-1\/3 { width: 33.333333%; }
        .print-w-1\/4 { width: 25%; }
        .print-text-center { text-align: center; }
        .print-text-right { text-align: right; }
        .print-flex { display: flex; }
        .print-justify-between { justify-content: space-between; }
        .print-items-end { align-items: flex-end; }
        .print-border-b { border-bottom: 1px solid black; }
        .print-border-t { border-top: 1px solid black; }
        .print-border-l { border-left: 1px solid black; }
        .print-border-r { border-right: 1px solid black; }
        .print-border { border: 1px solid black; }
        .print-p-1 { padding: 4px; }
        .print-p-2 { padding: 8px; }
        .print-px-2 { padding-left: 8px; padding-right: 8px; }
        .print-py-1 { padding-top: 4px; padding-bottom: 4px; }
        .print-h-24 { height: 96px; } /* For signature area */
        .print-h-32 { height: 128px; } /* For QR code area */
        .print-block { display: block; }
        .print-inline-block { display: inline-block; }
        .print-align-top { vertical-align: top; }
        .print-align-middle { vertical-align: middle; }
        .print-align-bottom { vertical-align: bottom; }
        .print-whitespace-nowrap { white-space: nowrap; }
        .print-qr-code-container {
          position: absolute;
          top: 2cm; /* Matches @page margin */
          left: 2cm; /* Matches @page margin */
          width: 80px; /* Adjust size as needed */
          height: 80px; /* Adjust size as needed */
          border: 1px solid black;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8pt;
          color: #666;
        }
        `}
      </style>

      {/* QR Code in top-left corner */}
      <div className="print-qr-code-container">
        <QrCodeIcon className="h-10 w-10 text-gray-400" />
        <span className="sr-only">QR Code Placeholder</span>
      </div>

      <div className="print-text-center print-font-bold print-text-lg print-mb-8">
        LEMBAR KOREKSI SP2D
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-y-1 print-text-sm print-mb-8 print-leading-relaxed">
        <div className="print-font-bold">Nama SKPD</div>
        <div>: {tagihan.nama_skpd || '-'}</div>

        <div className="print-font-bold">Jenis Tagihan</div>
        <div>: {tagihan.jenis_tagihan || '-'}</div>

        <div className="print-font-bold">Jenis SPM</div>
        <div>: {tagihan.jenis_spm || '-'}</div>

        <div className="print-font-bold">Nomor SPM</div>
        <div>: {tagihan.nomor_spm || '-'}</div>

        <div className="print-font-bold">Nomor Registrasi</div>
        <div>: {tagihan.nomor_registrasi || '-'}</div>

        <div className="print-font-bold print-align-top">Uraian</div>
        <div className="print-align-top">: {tagihan.uraian || '-'}</div>

        <div className="print-font-bold">Nilai Tagihan</div>
        <div>: {formatCurrency(tagihan.jumlah_kotor)}</div>

        <div className="print-font-bold">Waktu Koreksi</div>
        <div>: {formatDate(tagihan.waktu_koreksi)}</div>
      </div>

      <table className="print-table w-full border-collapse print-mb-8">
        <thead>
          <tr>
            <th className="w-[30px]">No</th>
            <th className="w-[250px]">Uraian</th>
            <th colSpan={2} className="w-[100px]">Memenuhi Syarat</th>
            <th>Keterangan</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th className="w-[50px]">Ya</th>
            <th className="w-[50px]">Tidak</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="print-text-center">1</td>
            <td>Tidak dapat diterbitkan SP2D</td>
            <td className="print-text-center"></td> {/* Selalu kosong untuk 'Ya' */}
            <td className="print-text-center">
              <div className="flex justify-center items-center"><XIcon className="h-4 w-4 text-red-600" /></div>
            </td>
            <td>{tagihan.catatan_koreksi || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="print-flex print-justify-end print-items-end print-mt-4">
        <div className="print-w-1/2 print-text-center print-text-sm">
          <p className="print-mb-2">Kuasa BUD</p>
          <div className="print-h-24"></div> {/* Placeholder untuk tanda tangan */}
          <p className="print-font-bold print-mb-8">{tagihan.nama_verifikator || '____________________'}</p> {/* Nama korektor */}
        </div>
      </div>
    </div>
  );
};

export default PrintKoreksi;