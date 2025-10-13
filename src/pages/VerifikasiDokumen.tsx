import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MadeWithDyad } from '@/components/made-with-dyad'; // Import MadeWithDyad

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
  catatan_verifikator?: string;
  nomor_registrasi?: string;
  waktu_registrasi?: string;
  nama_registrator?: string;
  waktu_verifikasi?: string;
  detail_verifikasi?: VerificationItem[];
  nomor_verifikasi?: string;
  nama_verifikator?: string;
  nomor_koreksi?: string; 
  id_korektor?: string; 
  waktu_koreksi?: string; 
  catatan_koreksi?: string; 
  sumber_dana?: string;
}

const VerifikasiDokumen = () => {
  const { tagihanId } = useParams<{ tagihanId: string }>();
  const [tagihan, setTagihan] = useState<Tagihan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tagihanId) {
      setError('ID Tagihan tidak ditemukan.');
      setLoading(false);
      return;
    }

    const fetchTagihanData = async () => {
      setLoading(true);
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-public-bill-details', {
          body: JSON.stringify({ id_input: tagihanId }),
        });

        if (invokeError) throw invokeError;
        if (!data) throw new Error('Data tagihan tidak ditemukan.');
        
        setTagihan(data as Tagihan);
      } catch (err: any) {
        console.error('Error fetching tagihan for public verification:', err.message);
        setError('Gagal memuat data tagihan: ' + err.message);
        toast.error('Gagal memuat data tagihan untuk verifikasi publik.');
      } finally {
        setLoading(false);
      }
    };

    fetchTagihanData();
  }, [tagihanId]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: localeId });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
        <p className="text-gray-600 dark:text-gray-400">Memuat detail dokumen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md p-8 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <p className="text-sm text-muted-foreground mt-4">Pastikan URL yang Anda akses benar.</p>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    );
  }

  if (!tagihan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
        <Card className="w-full max-w-md p-8 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">Dokumen Tidak Ditemukan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">Detail tagihan dengan ID "{tagihanId}" tidak ditemukan.</p>
            <p className="text-sm text-muted-foreground mt-4">Mungkin dokumen sudah dihapus atau ID tidak valid.</p>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    );
  }

  const showVerifikatorSection = tagihan.status_tagihan === 'Diteruskan' || tagihan.status_tagihan === 'Dikembalikan';
  const isCorrected = !!tagihan.id_korektor; // Check if it was corrected

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-950 p-4 sm:p-6">
      <Card className="w-full max-w-3xl p-6 sm:p-8 rounded-lg shadow-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
            Verifikasi Dokumen Tagihan
          </CardTitle>
          <p className="text-sm text-muted-foreground">ID Tagihan: {tagihanId}</p>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Bagian 1 - Detail Utama */}
          <div className="grid gap-2">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Detail Utama</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <Label className="text-muted-foreground">Nomor SPM</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="max-w-full whitespace-nowrap overflow-hidden text-ellipsis block font-medium">
                      {tagihan.nomor_spm}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tagihan.nomor_spm}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                <Label className="text-muted-foreground">Nama SKPD</Label>
                <p className="font-medium">{tagihan.nama_skpd}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jenis SPM</Label>
                <p className="font-medium">{tagihan.jenis_spm}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jenis Tagihan</Label>
                <p className="font-medium">{tagihan.jenis_tagihan}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Sumber Dana</Label>
                <p className="font-medium">{tagihan.sumber_dana || '-'}</p>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <Label className="text-muted-foreground">Uraian</Label>
                <p className="font-medium">{tagihan.uraian}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Jumlah Kotor</Label>
                <p className="font-medium">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status Tagihan</Label>
                <p className="font-medium">{tagihan.status_tagihan}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Waktu Input</Label>
                <p className="font-medium">{formatDate(tagihan.waktu_input)}</p>
              </div>
              {tagihan.nomor_registrasi && (
                <div>
                  <Label className="text-muted-foreground">Nomor Registrasi</Label>
                  <p className="font-medium">{tagihan.nomor_registrasi}</p>
                </div>
              )}
              {tagihan.nama_registrator && (
                <div>
                  <Label className="text-muted-foreground">Registrator</Label>
                  <p className="font-medium">{tagihan.nama_registrator}</p>
                </div>
              )}
              {tagihan.waktu_registrasi && (
                <div>
                  <Label className="text-muted-foreground">Waktu Registrasi</Label>
                  <p className="font-medium">{formatDate(tagihan.waktu_registrasi)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bagian 2 - Hasil Pemeriksaan Verifikator */}
          {showVerifikatorSection && (
            <div className="grid gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Hasil Pemeriksaan Verifikator
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                <div>
                  <Label className="text-muted-foreground">Diperiksa oleh</Label>
                  <p className="font-medium">{tagihan.nama_verifikator || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Waktu Pemeriksaan</Label>
                  <p className="font-medium">{formatDate(isCorrected ? tagihan.waktu_koreksi : tagihan.waktu_verifikasi)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nomor Verifikasi</Label>
                  <p className="font-medium">{isCorrected ? (tagihan.nomor_koreksi || '-') : (tagihan.nomor_verifikasi || '-')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status Akhir</Label>
                  <p className="font-medium">{tagihan.status_tagihan}</p>
                </div>
              </div>

              <h4 className="text-md font-medium mb-2">Checklist Verifikasi</h4>
              {isCorrected ? (
                // Simplified table for corrected items
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uraian</TableHead>
                      <TableHead className="w-[150px] text-center">Memenuhi Syarat</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Tidak dapat diterbitkan SP2D</TableCell>
                      <TableCell className="text-center">Tidak</TableCell>
                      <TableCell>{tagihan.catatan_koreksi || '-'}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                // Existing detailed table for standard verification
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uraian</TableHead>
                      <TableHead className="w-[150px] text-center">Memenuhi Syarat</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagihan.detail_verifikasi?.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>{detail.item}</TableCell>
                        <TableCell className="text-center">
                          {detail.memenuhi_syarat ? 'Ya' : 'Tidak'}
                        </TableCell>
                        <TableCell>{detail.keterangan || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default VerifikasiDokumen;