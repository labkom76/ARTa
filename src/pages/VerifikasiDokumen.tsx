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
import { MadeWithDyad } from '@/components/made-with-dyad';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  User,
  Building2,
  DollarSign,
  ClipboardCheck,
  FileSearch,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  tanggal_spm?: string;
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      'Diteruskan': {
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />
      },
      'Dikembalikan': {
        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
        icon: <XCircle className="h-3.5 w-3.5" />
      },
      'Menunggu Verifikasi': {
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        icon: <ClipboardCheck className="h-3.5 w-3.5" />
      },
    };

    const config = statusConfig[status] || {
      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icon: <FileText className="h-3.5 w-3.5" />
    };

    return (
      <Badge className={`${config.color} flex items-center gap-1.5 px-3 py-1 border font-medium`}>
        {config.icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-4">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Memuat detail dokumen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-red-200 dark:border-red-900/50">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
            <p className="text-sm text-slate-500 dark:text-slate-500">Pastikan URL yang Anda akses benar.</p>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    );
  }

  if (!tagihan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FileText className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-white">Dokumen Tidak Ditemukan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <p className="text-slate-600 dark:text-slate-400">Detail tagihan dengan ID "{tagihanId}" tidak ditemukan.</p>
            <p className="text-sm text-slate-500 dark:text-slate-500">Mungkin dokumen sudah dihapus atau ID tidak valid.</p>
          </CardContent>
        </Card>
        <MadeWithDyad />
      </div>
    );
  }

  const showVerifikatorSection = tagihan.status_tagihan === 'Diteruskan' || tagihan.status_tagihan === 'Dikembalikan';
  const isCorrected = !!tagihan.id_korektor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="shadow-xl border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/10">
          <CardHeader className="text-center border-b border-emerald-100 dark:border-emerald-900/30 pb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <FileSearch className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent pb-1">
              Detail Dokumen Tagihan
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Detail Utama Card */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Detail Utama</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nomor SPM */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Nomor SPM
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild className="w-full text-left">
                      <p className="font-mono text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg truncate border border-slate-200 dark:border-slate-800 cursor-help">
                        {tagihan.nomor_spm}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{tagihan.nomor_spm}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Tanggal SPM */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Tanggal SPM
                </Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {tagihan.tanggal_spm ? format(new Date(tagihan.tanggal_spm), 'dd MMMM yyyy', { locale: localeId }) : '-'}
                </p>
              </div>

              {/* Nama SKPD */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Nama SKPD
                </Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {tagihan.nama_skpd}
                </p>
              </div>

              {/* Jenis SPM */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jenis SPM</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {tagihan.jenis_spm}
                </p>
              </div>

              {/* Jenis Tagihan */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Jenis Tagihan</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {tagihan.jenis_tagihan}
                </p>
              </div>

              {/* Sumber Dana */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Sumber Dana</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {tagihan.sumber_dana || '-'}
                </p>
              </div>

              {/* Jumlah Kotor */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Jumlah Kotor
                </Label>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                  Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Uraian - Full Width */}
              <div className="col-span-1 md:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Uraian</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                  {tagihan.uraian}
                </p>
              </div>

              {/* Status Tagihan */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status Tagihan</Label>
                <div>{getStatusBadge(tagihan.status_tagihan)}</div>
              </div>

              {/* Waktu Input */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Waktu Input
                </Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  {formatDate(tagihan.waktu_input)}
                </p>
              </div>

              {/* Nomor Registrasi */}
              {tagihan.nomor_registrasi && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nomor Registrasi</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {tagihan.nomor_registrasi}
                  </p>
                </div>
              )}

              {/* Registrator */}
              {tagihan.nama_registrator && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Registrator
                  </Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {tagihan.nama_registrator}
                  </p>
                </div>
              )}

              {/* Waktu Registrasi */}
              {tagihan.waktu_registrasi && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Waktu Registrasi
                  </Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    {formatDate(tagihan.waktu_registrasi)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hasil Pemeriksaan Verifikator */}
        {showVerifikatorSection && (
          <Card className="shadow-lg border-emerald-200 dark:border-emerald-900/30 hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/10">
            <CardHeader className="border-b border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                  <ClipboardCheck className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                  Hasil Pemeriksaan Verifikator
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Diperiksa oleh */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Diperiksa oleh
                  </Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    {tagihan.nama_verifikator || '-'}
                  </p>
                </div>

                {/* Waktu Pemeriksaan */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Waktu Pemeriksaan
                  </Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    {formatDate(isCorrected ? tagihan.waktu_koreksi : tagihan.waktu_verifikasi)}
                  </p>
                </div>

                {/* Nomor Verifikasi */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Nomor Verifikasi</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-white dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    {isCorrected ? (tagihan.nomor_koreksi || '-') : (tagihan.nomor_verifikasi || '-')}
                  </p>
                </div>

                {/* Status Akhir */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status Akhir</Label>
                  <div>{getStatusBadge(tagihan.status_tagihan)}</div>
                </div>
              </div>

              {/* Checklist Verifikasi */}
              <div className="space-y-3">
                <h4 className="text-md font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Checklist Verifikasi
                </h4>
                <div className="overflow-x-auto rounded-lg border border-emerald-200 dark:border-emerald-900">
                  {isCorrected ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 hover:from-red-50 hover:to-orange-50 dark:hover:from-red-950/30 dark:hover:to-orange-950/30 border-b border-red-100 dark:border-red-900">
                          <TableHead className="font-bold text-red-900 dark:text-red-100">Uraian</TableHead>
                          <TableHead className="w-[150px] text-center font-bold text-red-900 dark:text-red-100">Memenuhi Syarat</TableHead>
                          <TableHead className="font-bold text-red-900 dark:text-red-100">Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-red-50/50 dark:hover:bg-red-950/10">
                          <TableCell className="font-medium">Tidak dapat diterbitkan SP2D</TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                              Tidak
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{tagihan.catatan_koreksi || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/30 dark:hover:to-teal-950/30 border-b border-emerald-100 dark:border-emerald-900">
                          <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Uraian</TableHead>
                          <TableHead className="w-[150px] text-center font-bold text-emerald-900 dark:text-emerald-100">Memenuhi Syarat</TableHead>
                          <TableHead className="font-bold text-emerald-900 dark:text-emerald-100">Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tagihan.detail_verifikasi?.map((detail, index) => (
                          <TableRow key={index} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10">
                            <TableCell className="font-medium">{detail.item}</TableCell>
                            <TableCell className="text-center">
                              {detail.memenuhi_syarat ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 flex items-center gap-1 w-fit mx-auto">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Ya
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 flex items-center gap-1 w-fit mx-auto">
                                  <XCircle className="h-3 w-3" />
                                  Tidak
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">{detail.keterangan || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default VerifikasiDokumen;