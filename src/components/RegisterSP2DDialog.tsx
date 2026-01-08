import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { FileCheck2, Calendar as CalendarIcon, Landmark, Info, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

import { Tagihan } from '@/types/tagihan';

interface RegisterSP2DDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        tanggal_sp2d: string;
        nama_bank: string;
        tanggal_bsg: string;
        catatan_sp2d: string;
    }) => void;
    tagihan: Tagihan | null;
    isSubmitting: boolean;
}

const BANK_OPTIONS = [
    { value: "SulutGo (BSG)", label: "SulutGo (BSG)" },
    { value: "BRI", label: "BRI" },
    { value: "BNI", label: "BNI" },
    { value: "Mandiri", label: "Mandiri" },
    { value: "Mandiri Taspen", label: "Mandiri Taspen" },
    { value: "Maluku Malut", label: "Maluku Malut" },
    { value: "Maspion Indonesia", label: "Maspion Indonesia" },
    { value: "Mayapada Internasional", label: "Mayapada Internasional" },
    { value: "Maybank Indonesia", label: "Maybank Indonesia" },
    { value: "Mayora", label: "Mayora" },
    { value: "Mega", label: "Mega" },
    { value: "Mega Syariah", label: "Mega Syariah" },
    { value: "Mestika Dharma", label: "Mestika Dharma" },
    { value: "Mizuho Indonesia", label: "Mizuho Indonesia" },
    { value: "MNC Internasional", label: "MNC Internasional" },
    { value: "Muamalat Indonesia", label: "Muamalat Indonesia" },
    { value: "Multiarta Sentosa", label: "Multiarta Sentosa" },
    { value: "Nagari", label: "Nagari" },
    { value: "Nano Syariah", label: "Nano Syariah" },
    { value: "Nationalnobu", label: "Nationalnobu" },
    { value: "NTB Syariah", label: "NTB Syariah" },
    { value: "OCBC NISP", label: "OCBC NISP" },
    { value: "Oke Indonesia", label: "Oke Indonesia" },
    { value: "Panin", label: "Panin" },
    { value: "Panin Dubai Syariah", label: "Panin Dubai Syariah" },
    { value: "Papua", label: "Papua" },
    { value: "Permata", label: "Permata" },
    { value: "QNB Indonesia", label: "QNB Indonesia" },
    { value: "Raya Indonesia", label: "Raya Indonesia" },
    { value: "Resona Perdania", label: "Resona Perdania" },
    { value: "Riau Kepri Syariah", label: "Riau Kepri Syariah" },
    { value: "Sahabat Sampoerna", label: "Sahabat Sampoerna" },
    { value: "SBI Indonesia", label: "SBI Indonesia" },
    { value: "Shinhan Indonesia", label: "Shinhan Indonesia" },
    { value: "Sinarmas", label: "Sinarmas" },
    { value: "Sulselbar", label: "Sulselbar" },
    { value: "Sulteng", label: "Sulteng" },
    { value: "Sultra", label: "Sultra" },
    { value: "Sumitomo Mitsui Indonesia", label: "Sumitomo Mitsui Indonesia" },
    { value: "Sumsel Babel", label: "Sumsel Babel" },
    { value: "Sumut", label: "Sumut" },
    { value: "Syariah Indonesia (BSI)", label: "Syariah Indonesia (BSI)" },
    { value: "Tabungan Negara (BTN)", label: "Tabungan Negara (BTN)" },
    { value: "UOB Indonesia", label: "UOB Indonesia" },
    { value: "Victoria International", label: "Victoria International" },
    { value: "Victoria Syariah", label: "Victoria Syariah" },
    { value: "Woori Saudara Indonesia 1906", label: "Woori Saudara Indonesia 1906" },
];

const RegisterSP2DDialog: React.FC<RegisterSP2DDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tagihan,
    isSubmitting,
}) => {
    const [tanggalSp2d, setTanggalSp2d] = useState<Date | undefined>(new Date());
    const [namaBank, setNamaBank] = useState('SulutGo (BSG)');
    const [tanggalBsg, setTanggalBsg] = useState<Date | undefined>(new Date());
    const [catatanSp2d, setCatatanSp2d] = useState('');

    // Calendar Popover states
    const [isCalendarSp2dOpen, setIsCalendarSp2dOpen] = useState(false);
    const [isCalendarBsgOpen, setIsCalendarBsgOpen] = useState(false);

    // Auto-calculated fields
    const [extractedNomorSp2d, setExtractedNomorSp2d] = useState('');
    const [extractedKodeSp2d, setExtractedKodeSp2d] = useState('');

    useEffect(() => {
        if (tagihan?.nomor_spm) {
            const parts = tagihan.nomor_spm.split('/');

            // Extract Nomor SP2D (Nomor Urut is the third part: index 2)
            if (parts.length > 2) {
                setExtractedNomorSp2d(parts[2].padStart(6, '0'));
            }

            // Extract Kode SP2D (from /M to the end)
            const mIndex = tagihan.nomor_spm.indexOf('/M/');
            if (mIndex !== -1) {
                setExtractedKodeSp2d(tagihan.nomor_spm.substring(mIndex));
            } else {
                setExtractedKodeSp2d('');
            }
        }
    }, [tagihan]);

    if (!tagihan) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm({
            tanggal_sp2d: tanggalSp2d ? format(tanggalSp2d, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            nama_bank: namaBank,
            tanggal_bsg: tanggalBsg ? format(tanggalBsg, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            catatan_sp2d: catatanSp2d,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
                <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Landmark className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                Registrasi SP2D
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Lengkapi detail penerbitan SP2D untuk dokumen SPM ini.
                        </DialogDescription>
                        <div className="mt-1 flex flex-wrap gap-2">
                            <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-lg shadow-sm">
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                                    {tagihan.nomor_spm}
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* SECTION: DATA OTOMATIS */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Informasi Otomatis</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">No. SP2D</Label>
                                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 min-h-[40px] flex items-center font-mono">
                                    {extractedNomorSp2d || '-'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kode SP2D</Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center font-mono">
                                    {extractedKodeSp2d || '-'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jenis Tagihan</Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.jenis_tagihan}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">SKPD</Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.nama_skpd}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Jumlah</Label>
                                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 min-h-[40px] flex items-center">
                                    Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Uraian</Label>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[60px] flex items-start leading-relaxed">
                                    {tagihan.uraian}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: DATA MANUAL */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Input Data Manual</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tanggal SP2D */}
                            <div className="space-y-1">
                                <Label htmlFor="tanggal_sp2d" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <CalendarIcon className="h-3.5 w-3.5" />
                                    Tgl. SP2D
                                </Label>
                                <Popover open={isCalendarSp2dOpen} onOpenChange={setIsCalendarSp2dOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-12 rounded-xl justify-start text-left font-medium bg-slate-50/50 border-slate-200",
                                                !tanggalSp2d && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4 text-emerald-500" />
                                            {tanggalSp2d ? (
                                                format(tanggalSp2d, "dd MMMM yyyy", { locale: id })
                                            ) : (
                                                <span>Pilih Tanggal</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={tanggalSp2d}
                                            onSelect={(date) => {
                                                setTanggalSp2d(date);
                                                setIsCalendarSp2dOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Nama Bank */}
                            <div className="space-y-1">
                                <Label htmlFor="nama_bank" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Landmark className="h-3.5 w-3.5" />
                                    Nama Bank
                                </Label>
                                <Combobox
                                    options={BANK_OPTIONS}
                                    value={namaBank}
                                    onValueChange={setNamaBank}
                                    placeholder="Cari atau Pilih Bank..."
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50"
                                />
                            </div>

                            {/* Tanggal BSG */}
                            <div className="space-y-1">
                                <Label htmlFor="tanggal_bsg" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <FileCheck2 className="h-3.5 w-3.5" />
                                    Tgl. Serah BSG
                                </Label>
                                <Popover open={isCalendarBsgOpen} onOpenChange={setIsCalendarBsgOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-12 rounded-xl justify-start text-left font-medium bg-slate-50/50 border-slate-200",
                                                !tanggalBsg && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4 text-emerald-500" />
                                            {tanggalBsg ? (
                                                format(tanggalBsg, "dd MMMM yyyy", { locale: id })
                                            ) : (
                                                <span>Pilih Tanggal</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={tanggalBsg}
                                            onSelect={(date) => {
                                                setTanggalBsg(date);
                                                setIsCalendarBsgOpen(false);
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Catatan Koreksi */}
                            <div className="space-y-1 md:col-span-2">
                                <Label htmlFor="catatan_sp2d" className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Info className="h-3.5 w-3.5" />
                                    Catatan Koreksi(Opsional)
                                </Label>
                                <Textarea
                                    id="catatan_sp2d"
                                    placeholder="Tambahkan catatan koreksi atau informasi tambahan..."
                                    value={catatanSp2d}
                                    onChange={(e) => setCatatanSp2d(e.target.value)}
                                    className="min-h-[100px] rounded-xl border-slate-200 focus:ring-emerald-500 bg-slate-50/50 p-4"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6 gap-3">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-12 rounded-xl px-8 font-semibold"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-12 rounded-xl px-10 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 transition-all"
                        >
                            {isSubmitting ? 'Memproses...' : 'Simpan Registrasi'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default RegisterSP2DDialog;
