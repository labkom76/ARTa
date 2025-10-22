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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Konfirmasi Registrasi Tagihan</DialogTitle>
          <DialogDescription>
            Periksa detail tagihan di bawah dan konfirmasi registrasi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right font-semibold">Nomor Registrasi Baru:</Label>
            <p className="col-span-2 text-lg font-bold text-blue-600">{generatedNomorRegistrasi || 'Membuat...'}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Nomor SPM:</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="col-span-2 max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis block font-medium">
                  {tagihan.nomor_spm}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tagihan.nomor_spm}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Nama SKPD:</Label>
            <p className="col-span-2">{tagihan.nama_skpd}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Jenis SPM:</Label>
            <p className="col-span-2">{tagihan.jenis_spm}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Jenis Tagihan:</Label>
            <p className="col-span-2">{tagihan.jenis_tagihan}</p>
          </div>
          {/* New: Sumber Dana */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Sumber Dana:</Label>
            <p className="col-span-2">{tagihan.sumber_dana || '-'}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Uraian:</Label>
            <p className="col-span-2">{tagihan.uraian}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Jumlah Kotor:</Label>
            <p className="col-span-2">Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Waktu Input:</Label>
            <p className="col-span-2">{formatDate(tagihan.waktu_input)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>Batal</Button>
          <Button
            onClick={() => tagihan.id_tagihan && generatedNomorRegistrasi && onConfirm(tagihan.id_tagihan, generatedNomorRegistrasi)}
            disabled={isConfirming || !generatedNomorRegistrasi}
          >
            {isConfirming ? 'Mengkonfirmasi...' : 'Konfirmasi & Registrasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrasiConfirmationDialog;