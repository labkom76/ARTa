import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Keep the interface
interface BankOption {
    value: string;
    label: string;
}

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

    const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(false);
    const [isConfirmAddBankOpen, setIsConfirmAddBankOpen] = useState(false);
    const [tempBankName, setTempBankName] = useState('');

    const fetchBanks = async () => {
        setIsLoadingBanks(true);
        try {
            const { data, error } = await supabase
                .from('master_bank')
                .select('nama_bank')
                .eq('is_active', true)
                .order('nama_bank', { ascending: true });

            if (error) throw error;
            if (data) {
                const options = data.map(b => ({ value: b.nama_bank, label: b.nama_bank }));
                // Prioritize SulutGo (BSG) at the top
                const sortedOptions = options.sort((a, b) => {
                    if (a.value === 'SulutGo (BSG)') return -1;
                    if (b.value === 'SulutGo (BSG)') return 1;
                    return a.label.localeCompare(b.label);
                });
                setBankOptions(sortedOptions);
            }
        } catch (error: any) {
            console.error('Error fetching banks:', error.message);
            toast.error('Gagal memuat daftar bank');
        } finally {
            setIsLoadingBanks(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchBanks();
        }
    }, [isOpen]);

    const handleCreateBank = (newBankName: string) => {
        setTempBankName(newBankName);
        setIsConfirmAddBankOpen(true);
    };

    const confirmCreateBank = async () => {
        try {
            const { data, error } = await supabase
                .from('master_bank')
                .insert([{ nama_bank: tempBankName }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    toast.error('Bank sudah ada dalam daftar');
                } else {
                    throw error;
                }
                return;
            }

            if (data) {
                const newOption = { value: data.nama_bank, label: data.nama_bank };
                setBankOptions(prev => [...prev, newOption].sort((a, b) => {
                    if (a.value === 'SulutGo (BSG)') return -1;
                    if (b.value === 'SulutGo (BSG)') return 1;
                    return a.label.localeCompare(b.label);
                }));
                setNamaBank(data.nama_bank);
                toast.success(`Bank "${data.nama_bank}" berhasil ditambahkan!`);
            }
        } catch (error: any) {
            console.error('Error creating bank:', error.message);
            toast.error('Gagal menambah bank baru');
        } finally {
            setIsConfirmAddBankOpen(false);
            setTempBankName('');
        }
    };

    useEffect(() => {
        if (tagihan) {
            // Data Otomatis part
            if (tagihan.nomor_spm) {
                const parts = tagihan.nomor_spm.split('/');
                if (parts.length > 2) {
                    setExtractedNomorSp2d(parts[2].padStart(6, '0'));
                }
                const mIndex = tagihan.nomor_spm.indexOf('/M/');
                if (mIndex !== -1) {
                    setExtractedKodeSp2d(tagihan.nomor_spm.substring(mIndex));
                } else {
                    setExtractedKodeSp2d('');
                }
            }

            // Sync Manual Fields
            // Use existing data if available (Mode Edit), otherwise use defaults (Mode New)
            setTanggalSp2d(tagihan.tanggal_sp2d ? parseISO(tagihan.tanggal_sp2d) : new Date());
            setNamaBank(tagihan.nama_bank || 'SulutGo (BSG)');
            setTanggalBsg(tagihan.tanggal_bsg ? parseISO(tagihan.tanggal_bsg) : new Date());
            setCatatanSp2d(tagihan.catatan_sp2d || '');
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
                                    options={bankOptions}
                                    value={namaBank}
                                    onValueChange={setNamaBank}
                                    onCreate={handleCreateBank}
                                    createLabel="Tambah Bank"
                                    placeholder={isLoadingBanks ? "Memuat..." : "Cari atau Pilih Bank..."}
                                    disabled={isLoadingBanks}
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

            <AlertDialog open={isConfirmAddBankOpen} onOpenChange={setIsConfirmAddBankOpen}>
                <AlertDialogContent className="rounded-xl border-emerald-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-emerald-700">
                            <Landmark className="h-5 w-5" />
                            Tambah Bank Baru?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            Anda akan menambahkan <span className="font-bold text-slate-900">"{tempBankName}"</span> ke dalam daftar bank permanen. Pastikan penulisan nama bank sudah benar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="h-10 rounded-lg border-slate-200">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmCreateBank}
                            className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Ya, Tambahkan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
};

export default RegisterSP2DDialog;
