import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckIcon,
  XIcon,
  FileText,
  Calendar,
  User,
  DollarSign,
  Building2,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';

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

interface TagihanDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tagihan: Tagihan | null;
}

const TagihanDetailDialog: React.FC<TagihanDetailDialogProps> = ({ isOpen, onClose, tagihan }) => {
  if (!tagihan) return null;

  const showVerifikatorSection = tagihan.status_tagihan === 'Diteruskan' ||
    tagihan.status_tagihan === 'Dikembalikan' ||
    tagihan.status_tagihan === 'Menunggu Verifikasi';

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: id });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      'Menunggu Registrasi': { variant: 'outline', className: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800' },
      'Tinjau Kembali': { variant: 'outline', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
      'Menunggu Verifikasi': { variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
      'Diteruskan': { variant: 'outline', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
      'Dikembalikan': { variant: 'destructive', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, className: '' };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
        <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 pr-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                Detail Tagihan
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Informasi lengkap mengenai tagihan ini
            </DialogDescription>
            <div className="flex items-center gap-2 pt-1">
              {getStatusBadge(tagihan.status_tagihan)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Bagian 1 - Detail Utama */}
          <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Informasi Tagihan</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nomor SPM</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="w-full text-left">
                      <p className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                        {tagihan.nomor_spm}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono">{tagihan.nomor_spm}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nama SKPD</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nama_skpd}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jenis SPM</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.jenis_spm}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jenis Tagihan</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.jenis_tagihan}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sumber Dana</Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.sumber_dana || '-'}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Jumlah Kotor
                </Label>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  Rp {tagihan.jumlah_kotor.toLocaleString('id-ID')}
                </p>
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uraian</Label>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg leading-relaxed">{tagihan.uraian}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Waktu Input
                </Label>
                <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{formatDate(tagihan.waktu_input)}</p>
              </div>
            </div>
          </div>

          {/* Bagian Registrasi (jika ada) */}
          {(tagihan.nomor_registrasi || tagihan.nama_registrator || tagihan.waktu_registrasi) && (
            <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Informasi Registrasi</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tagihan.nomor_registrasi && (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nomor Registrasi</Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nomor_registrasi}</p>
                  </div>
                )}
                {tagihan.nama_registrator && (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Registrator
                    </Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nama_registrator}</p>
                  </div>
                )}
                {tagihan.waktu_registrasi && (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Waktu Registrasi
                    </Label>
                    <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{formatDate(tagihan.waktu_registrasi)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bagian 2 - Hasil Pemeriksaan Verifikator */}
          {showVerifikatorSection && (tagihan.detail_verifikasi || tagihan.catatan_koreksi) && (
            <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hasil Pemeriksaan Verifikator</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Diperiksa oleh
                  </Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nama_verifikator || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Waktu Pemeriksaan
                  </Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{formatDate(tagihan.waktu_verifikasi)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nomor Verifikasi</Label>
                  <p className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg">{tagihan.nomor_verifikasi || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status Akhir</Label>
                  <div className="flex items-center h-full">
                    {getStatusBadge(tagihan.status_tagihan)}
                  </div>
                </div>
                {tagihan.catatan_verifikator && (
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Catatan Verifikator
                    </Label>
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50 leading-relaxed">{tagihan.catatan_verifikator}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-emerald-500"></div>
                  Checklist Verifikasi
                </h4>

                {tagihan.id_korektor ? (
                  <div className="rounded-lg border border-red-200 dark:border-red-800/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-red-50 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <TableHead className="text-red-900 dark:text-red-300 font-semibold">Uraian</TableHead>
                          <TableHead className="w-[150px] text-center text-red-900 dark:text-red-300 font-semibold">Memenuhi Syarat</TableHead>
                          <TableHead className="text-red-900 dark:text-red-300 font-semibold">Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-red-50/50 dark:hover:bg-red-950/20">
                          <TableCell className="font-medium">Tidak dapat diterbitkan SP2D</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive" className="font-semibold">Tidak</Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">{tagihan.catatan_koreksi || '-'}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                          <TableHead className="text-emerald-900 dark:text-emerald-300 font-semibold">Uraian</TableHead>
                          <TableHead className="w-[150px] text-center text-emerald-900 dark:text-emerald-300 font-semibold">Memenuhi Syarat</TableHead>
                          <TableHead className="text-emerald-900 dark:text-emerald-300 font-semibold">Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tagihan.detail_verifikasi?.map((detail, index) => (
                          <TableRow key={index} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                            <TableCell className="font-medium text-slate-900 dark:text-slate-200">{detail.item}</TableCell>
                            <TableCell className="text-center">
                              {detail.memenuhi_syarat ? (
                                <div className="flex items-center justify-center">
                                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <CheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <XIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">{detail.keterangan || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagihanDetailDialog;