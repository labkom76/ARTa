import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ClipboardCheck,
  AlertCircle,
  Landmark,
  Clock,
  ArrowRight,
  Info,
  ChevronRight,
  FileText,
  Building2,
  Calendar,
  User,
  CheckIcon,
  XIcon,
  DollarSign
} from 'lucide-react';

import { Tagihan, VerificationItem } from '@/types/tagihan';

interface TagihanDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tagihan: Tagihan | null;
}

const TagihanDetailDialog: React.FC<TagihanDetailDialogProps> = ({ isOpen, onClose, tagihan }) => {
  const [activeStep, setActiveStep] = React.useState<string | null>(null);

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
      'Selesai': { variant: 'outline', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
    };

    const config = statusConfig[status] || { variant: 'outline' as const, className: '' };
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950">
        <DialogHeader className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Riwayat Perjalanan Tagihan
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Informasi lengkap mengenai tagihan ini
              </DialogDescription>
              <div className="mt-2">
                {getStatusBadge(tagihan.status_tagihan)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-6 pb-12">
            <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-slate-200 before:to-transparent dark:before:via-slate-800 dark:before:to-transparent">

              {/* Step 1: Input Tagihan */}
              <div className="relative flex items-start gap-6 group">
                <div className="absolute left-0 mt-1.5 w-10 h-10 rounded-full bg-white dark:bg-slate-950 border-2 border-emerald-500 flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 ml-10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none">Dibuat</Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(tagihan.waktu_input)}</span>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm group-hover:border-emerald-200 dark:group-hover:border-emerald-900/30 transition-all">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Informasi Tagihan</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Nomor SPM
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/50 px-2 py-1.5 rounded-lg truncate cursor-help">{tagihan.nomor_spm}</p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-mono text-xs">{tagihan.nomor_spm}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Tanggal SPM
                        </label>
                        <p className="font-bold text-xs text-slate-700 dark:text-slate-300">{tagihan.tanggal_spm ? format(new Date(tagihan.tanggal_spm), 'dd MMMM yyyy', { locale: id }) : '-'}</p>
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Nama SKPD
                        </label>
                        <p className="font-bold text-xs text-slate-900 dark:text-white">{tagihan.nama_skpd}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Jenis SPM
                        </label>
                        <p className="font-medium text-xs text-slate-700 dark:text-slate-300">{tagihan.jenis_spm || '-'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Jenis Tagihan
                        </label>
                        <p className="font-medium text-xs text-slate-700 dark:text-slate-300">{tagihan.jenis_tagihan || 'Langsung (LS)'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <Landmark className="h-3 w-3" />
                          Sumber Dana
                        </label>
                        <p className="font-medium text-xs text-slate-700 dark:text-slate-300">{tagihan.sumber_dana || '-'}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-600" />
                          Jumlah Kotor
                        </label>
                        <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Uraian
                        </label>
                        <p className="font-medium text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tagihan.uraian}</p>
                      </div>

                      <div className="space-y-1.5 col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="text-slate-400 uppercase font-bold text-[9px] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Waktu Input
                        </label>
                        <p className="font-bold text-xs text-slate-700 dark:text-slate-300">{formatDate(tagihan.waktu_input)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Registrasi */}
              <div className="relative flex items-start gap-6 group">
                <div className={`absolute left-0 mt-1.5 w-10 h-10 rounded-full bg-white dark:bg-slate-950 border-2 ${tagihan.nomor_registrasi ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700'} flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110`}>
                  <ClipboardCheck className={`h-4 w-4 ${tagihan.nomor_registrasi ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 ml-10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-semibold border-none ${tagihan.nomor_registrasi ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>Registrasi</Badge>
                      {tagihan.waktu_registrasi && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(tagihan.waktu_registrasi)}</span>}
                    </div>
                    {tagihan.nomor_registrasi && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveStep('registrasi')} className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 rounded-full px-3">
                        Lihat Selengkapnya <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all ${tagihan.nomor_registrasi ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-900/30' : 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    {tagihan.nomor_registrasi ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tagihan.nama_registrator}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium uppercase">Registrator</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800/30">
                          <CheckIcon className="h-3.5 w-3.5" /> Berkas Telah Terdaftar
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <Info className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-500 italic">Menunggu proses registrasi...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Verifikasi */}
              <div className="relative flex items-start gap-6 group">
                <div className={`absolute left-0 mt-1.5 w-10 h-10 rounded-full bg-white dark:bg-slate-950 border-2 ${tagihan.status_tagihan === 'Dikembalikan' ? 'border-red-500' : (tagihan.nama_verifikator ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-700')} flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110`}>
                  <ClipboardCheck className={`h-4 w-4 ${tagihan.status_tagihan === 'Dikembalikan' ? 'text-red-500' : (tagihan.nama_verifikator ? 'text-emerald-600' : 'text-slate-400')}`} />
                </div>
                <div className="flex-1 ml-10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-semibold border-none ${tagihan.status_tagihan === 'Dikembalikan' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : (tagihan.status_tagihan === 'Diteruskan' || tagihan.status_tagihan === 'Selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}`}>
                        Pemeriksaan {tagihan.status_tagihan === 'Dikembalikan' ? 'Ditolak' : (tagihan.status_tagihan === 'Diteruskan' || tagihan.status_tagihan === 'Selesai' ? 'Disetujui' : '')}
                      </Badge>
                      {tagihan.waktu_verifikasi && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(tagihan.waktu_verifikasi)}</span>}
                    </div>
                    {tagihan.nama_verifikator && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveStep('verifikasi')} className={`h-7 text-xs gap-1 rounded-full px-3 ${tagihan.status_tagihan === 'Dikembalikan' ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}>
                        Lihat Selengkapnya <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all ${tagihan.nama_verifikator ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' : 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    {tagihan.nama_verifikator ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tagihan.nama_verifikator}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium uppercase">Verifikator</span>
                        </div>
                        {tagihan.status_tagihan === 'Dikembalikan' ? (
                          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-bold bg-red-50/50 dark:bg-red-950/20 px-3 py-2 rounded-lg border border-red-100 dark:border-red-800/30">
                            <XIcon className="h-3.5 w-3.5" /> Tagihan Dikembalikan
                          </div>
                        ) : (tagihan.status_tagihan === 'Diteruskan' || tagihan.status_tagihan === 'Selesai') ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                            <CheckIcon className="h-3.5 w-3.5" /> Tagihan Diteruskan
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-500 italic">Menunggu pemeriksaan verifikator...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4: SP2D */}
              <div className="relative flex items-start gap-6 group">
                <div className={`absolute left-0 mt-1.5 w-10 h-10 rounded-full bg-white dark:bg-slate-950 border-2 ${tagihan.tanggal_sp2d ? 'border-blue-500' : 'border-slate-300 dark:border-slate-700'} flex items-center justify-center z-10 shadow-sm transition-all group-hover:scale-110`}>
                  <Landmark className={`h-4 w-4 ${tagihan.tanggal_sp2d ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 ml-10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`font-semibold border-none ${tagihan.tanggal_sp2d ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>SP2D Terbit</Badge>
                      {tagihan.tanggal_sp2d && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(tagihan.tanggal_sp2d)}</span>}
                    </div>
                    {tagihan.tanggal_sp2d && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveStep('sp2d')} className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 gap-1 rounded-full px-3">
                        Lihat Selengkapnya <ChevronRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className={`p-4 rounded-2xl border transition-all ${tagihan.tanggal_sp2d ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-900/30' : 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800'}`}>
                    {tagihan.tanggal_sp2d ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tagihan.nama_register_sp2d || 'Petugas SP2D'}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium uppercase">Register SP2D</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-800/30">
                          <CheckIcon className="h-3.5 w-3.5" /> SP2D Telah Terbit
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <Info className="h-4 w-4 text-slate-400" />
                        <p className="text-sm text-slate-500 italic">Menunggu penerbitan SP2D...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 px-4 rounded-xl font-bold border-slate-200 dark:border-slate-800">
            Tutup
          </Button>
        </DialogFooter>

        {/* --- INTERACTIVE DETAIL MODALS --- */}

        {/* Modal Detail Registrasi */}
        {/* Modal Detail Registrasi */}
        <Dialog open={activeStep === 'registrasi'} onOpenChange={() => setActiveStep(null)}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl border-blue-100 dark:border-blue-900/30 shadow-2xl">
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Detail Registrasi</DialogTitle>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Registrator
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{tagihan.nama_registrator}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Waktu Registrasi
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(tagihan.waktu_registrasi)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Nomor Registrasi
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                  <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 truncate">{tagihan.nomor_registrasi}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-right">
              <Button onClick={() => setActiveStep(null)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-8">Tutup</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Detail Verifikasi (Checklist) */}
        <Dialog open={activeStep === 'verifikasi'} onOpenChange={() => setActiveStep(null)}>
          <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-3xl border-emerald-100 dark:border-emerald-900/30 shadow-2xl">
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Hasil Pemeriksaan Verifikator</DialogTitle>
                </div>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Diperiksa oleh
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{tagihan.nama_verifikator}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Waktu Pemeriksaan
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(tagihan.waktu_verifikasi)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Nomor Verifikasi
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{tagihan.nomor_verifikasi || '-'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Status Akhir
                  </label>
                  <div className="pt-1.5">
                    {tagihan.status_tagihan === 'Dikembalikan' ? (
                      <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 rounded-full px-3 py-1 text-xs font-semibold">
                        Dikembalikan
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-100 rounded-full px-3 py-1 text-xs font-semibold">
                        Diteruskan
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Checklist Verifikasi
                </h4>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                      <TableHead className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 h-10">Uraian</TableHead>
                      <TableHead className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 h-10 text-center">Memenuhi Syarat</TableHead>
                      <TableHead className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 h-10">Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tagihan.detail_verifikasi?.map((detail, index) => (
                      <TableRow key={index} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 border-slate-50 dark:border-slate-900">
                        <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-200 py-4 h-14">{detail.item}</TableCell>
                        <TableCell className="text-center">
                          {detail.memenuhi_syarat ? (
                            <div className="mx-auto h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/30">
                              <CheckIcon className="h-4 w-4 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="mx-auto h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center border border-red-200 dark:border-red-800 transition-all shadow-sm">
                              <XIcon className="h-3.5 w-3.5 text-red-600" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">{detail.keterangan || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-right">
              <Button onClick={() => setActiveStep(null)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8">Tutup</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Detail SP2D (Register) */}
        <Dialog open={activeStep === 'sp2d'} onOpenChange={() => setActiveStep(null)}>
          <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-3xl border-blue-100 dark:border-blue-900/30 shadow-2xl">
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">Detail SP2D</DialogTitle>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Petugas Pemeriksa
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase truncate">{tagihan.nama_register_sp2d || 'Petugas SP2D'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Tanggal SP2D
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(tagihan.tanggal_sp2d)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Nama Bank
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{tagihan.nama_bank || '-'}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Diserahkan ke BSG
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(tagihan.tanggal_bsg)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Nomor SP2D
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 cursor-help">
                        <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400 truncate max-w-full">
                          {tagihan.nomor_sp2d || '-'}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-mono text-xs">{tagihan.nomor_sp2d || '-'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-right">
              <Button onClick={() => setActiveStep(null)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-8">Tutup</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default TagihanDetailDialog;