import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { CheckIcon, XIcon } from 'lucide-react'; // Import CheckIcon and XIcon

interface VerificationItem {
  item: string;
  memenuhi_syarat: boolean;
  keterangan: string;
}

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
  waktu_verifikasi?: string;
  detail_verifikasi?: VerificationItem[];
  nomor_verifikasi?: string;
  nama_verifikator?: string;
  sumber_dana?: string; // Add sumber_dana
}

const checklistItems = [
  'SPTJ',
  'Kebenaran Perhitungan Tagihan',
  'Kesesuaian Kode Rekening',
  'E-Billing',
  'Fotocopy Rekening Pihak Ketiga / Bendahara Pengeluaran / Bendahara Pengeluaran Pembantu',
  'Fotocopy NPWP',
  'Tanda Penerimaan / Kwitansi / Bukti Pembayaran',
  'Lainnya',
];

const PrintVerifikasi = () => {
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
      // Give a small delay for content to render before printing
      const timer = setTimeout(() => {
        window.print();
        // Optionally close the window after printing, or leave it open
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
    return <div className="p-8 text-center text-gray-700">Memuat lembar verifikasi...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  }

  if (!tagihan) {
    return <div className="p-8 text-center text-gray-700">Data tagihan tidak tersedia.</div>;
  }

  return (
    <>
      <style>
        {`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          @media print {
            body {
              background-color: white !important;
              padding: 0 !important;
            }
            .container {
              padding: 20px !important; /* Mengurangi padding untuk memberi lebih banyak ruang vertikal */
              background-color: white !important;
            }
          }

          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background-color: white;
          }

          h1 {
            text-align: center;
            font-size: 20px;
            margin-bottom: 20px; /* Mengurangi margin-bottom */
            font-weight: bold;
          }

          .info-section {
            margin-bottom: 15px; /* Mengurangi margin-bottom */
          }

          .info-row {
            display: flex;
            margin-bottom: 5px; /* Mengurangi margin-bottom */
            font-size: 13px;
          }

          .info-label {
            width: 150px;
            flex-shrink: 0;
          }

          .info-separator {
            margin: 0 10px;
          }

          .info-value {
            flex: 1;
          }

          .highlight {
            font-weight: bold;
            font-size: 14px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0; /* Mengurangi margin */
            font-size: 12px;
          }

          table, th, td {
            border: 1px solid #000;
          }

          th, td {
            padding: 8px; /* Mengurangi padding */
            text-align: center;
          }

          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }

          .col-no {
            width: 50px;
          }

          .col-uraian {
            width: 300px;
          }

          .col-syarat {
            width: 70px;
          }

          .col-keterangan {
            flex: 1;
          }

          .text-left {
            text-align: left;
            padding-left: 10px;
          }

          .signature-section {
            margin-top: 30px; /* Mengurangi margin-top */
            text-align: right;
          }

          .signature-title {
            font-size: 13px;
            margin-bottom: 30px; /* Mengurangi margin-bottom secara signifikan */
            margin-right: 60px;
          }

          .signature-name {
            font-size: 13px;
            font-weight: bold;
            margin-right: 70px;
            padding-top: 20px;
          }

          .qr-code {
            width: 100px; /* Sedikit mengurangi ukuran QR code */
            height: 100px; /* Sedikit mengurangi ukuran QR code */
            background-color: #e0e0e0;
            margin: 10px 0; /* Mengurangi margin */
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px; /* Mengurangi ukuran font */
            color: #666;
            margin-left: 50px;
          }

          .checkmark {
            font-size: 16px;
          }
        `}
      </style>

      <div className="container">
        <h1>LEMBAR VERIFIKASI SKPKD</h1>

        <div className="info-section">
          <div className="info-row">
            <span className="info-label">Nama SKPD</span>
            <span className="info-separator">:</span>
            <span className="info-value">{tagihan.nama_skpd || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Jenis Tagihan</span>
            <span className="info-separator">:</span>
            <span className="info-value">{tagihan.jenis_tagihan || '-'}</span>
          </div>
          {/* New: Sumber Dana */}
          <div className="info-row">
            <span className="info-label">Sumber Dana</span>
            <span className="info-separator">:</span>
            <span className="info-value">{tagihan.sumber_dana || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Jenis SPM</span>
            <span className="info-separator">:</span>
            <span className="info-value">{tagihan.jenis_spm || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Nomor SPM</span>
            <span className="info-separator">:</span>
            <span className="info-value">{tagihan.nomor_spm || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Uraian</span>
            <span className="info-separator">:</span>
            <span className="info-value">{tagihan.uraian || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Nilai Tagihan</span>
            <span className="info-separator">:</span>
            <span className="info-value highlight">{formatCurrency(tagihan.jumlah_kotor)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Waktu Verifikasi</span>
            <span className="info-separator">:</span>
            <span className="info-value">{formatDate(tagihan.waktu_verifikasi)}</span>
          </div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th className="col-no" rowSpan={2}>No</th>
              <th className="col-uraian" rowSpan={2}>Uraian</th>
              <th colSpan={2}>Memenuhi Syarat</th>
              <th className="col-keterangan" rowSpan={2}>
                Keterangan
                {tagihan.nomor_verifikasi && (
                  <>
                    <br />
                    (No. Verifikasi : {tagihan.nomor_verifikasi})
                  </>
                )}
              </th>
            </tr>
            <tr>
              <th className="col-syarat">Ya</th>
              <th className="col-syarat">Tidak</th>
            </tr>
          </thead>
          <tbody>
            {checklistItems.map((item, index) => {
              const detail = tagihan.detail_verifikasi?.find(d => d.item === item);
              const isMet = detail?.memenuhi_syarat;
              const keterangan = detail?.keterangan || '';

              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td className="text-left">{item}</td>
                  <td>
                    {isMet ? <CheckIcon className="h-4 w-4 mx-auto text-green-600" /> : ''}
                  </td>
                  <td>
                    {isMet === false ? <XIcon className="h-4 w-4 mx-auto text-red-600" /> : ''}
                  </td>
                  <td className="text-left">{keterangan}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="signature-section">
          <div className="signature-title">VERIFIKATOR</div>
          <div className="signature-name">
            {tagihan.nama_verifikator || '____________________'}
          </div>
          <div className="qr-code">[QR Code]</div>
        </div>
      </div>
    </>
  );
};

export default PrintVerifikasi;