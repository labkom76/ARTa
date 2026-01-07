import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { CheckCircle2 } from 'lucide-react'; // Import icon

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
  sumber_dana?: string; // Add sumber_dana
  tanggal_spm?: string; // Add tanggal_spm
}

interface RegistrasiConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tagihanId: string, nomorRegistrasi: string) => void;
  tagihan: Tagihan | null;
  generatedNomorRegistrasi: string | null;
  isConfirming: boolean;
}

const RegistrasiConfirmationDialog: React.FC<RegistrasiConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tagihan,
  generatedNomorRegistrasi,
  isConfirming,
}) => {
  if (!tagihan) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy HH:mm', { locale: id });
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="text-2xl">Konfirmasi Registrasi Tagihan</DialogTitle>
          </div>
          <DialogDescription>
            Periksa detail tagihan di bawah dan konfirmasi registrasi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nomor Registrasi Highlight */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg">
            <Label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">Nomor Registrasi Baru</Label>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{generatedNomorRegistrasi || 'Membuat...'}</p>
          </div>

          {/* Detail Tagihan */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Nomor SPM:</Label>
              <p className="flex-1 font-medium text-slate-900 dark:text-white break-all">{tagihan.nomor_spm}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Tanggal SPM:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{formatDate(tagihan.tanggal_spm || '')}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Nama SKPD:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{tagihan.nama_skpd}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Jenis SPM:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{tagihan.jenis_spm}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Jenis Tagihan:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{tagihan.jenis_tagihan}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Sumber Dana:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{tagihan.sumber_dana || '-'}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Uraian:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{tagihan.uraian}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Jumlah Kotor:</Label>
              <p className="flex-1 font-semibold text-slate-900 dark:text-white">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</p>
            </div>

            <div className="flex items-start gap-3">
              <Label className="text-sm text-slate-600 dark:text-slate-400 w-32 pt-1 shrink-0">Waktu Input:</Label>
              <p className="flex-1 text-slate-900 dark:text-white">{formatDate(tagihan.waktu_input)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>Batal</Button>
          <Button
            onClick={() => tagihan.id_tagihan && generatedNomorRegistrasi && onConfirm(tagihan.id_tagihan, generatedNomorRegistrasi)}
            disabled={isConfirming || !generatedNomorRegistrasi}
            className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isConfirming ? 'Mengkonfirmasi...' : 'Konfirmasi & Registrasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrasiConfirmationDialog;