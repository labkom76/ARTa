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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ReceiptIcon,
    FileTextIcon,
    CalculatorIcon,
    ShieldCheckIcon,
    AlertCircle,
    PlusCircle,
    Trash2,
    Building2,
    FileText,
    DollarSign,
    Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { Tagihan } from '@/types/tagihan';

interface InputPajakDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    tagihan: Tagihan;
    onSuccess: () => void;
}

const pajakMapping: Record<string, string> = {
    'PPh Ps 21': '411121',
    'PPh Ps 22': '411122',
    'PPh Ps 23': '411124',
    'PPh Ps 4 Ayat (2)': '411128',
    'PPN Dalam Negeri': '411211',
};

interface PajakEntry {
    tempId: string; // Used for React keys
    id_pajak?: string;
    jenis_pajak: string;
    kode_akun: string;
    jumlah_pajak: string;
    ntpn: string;
    ntb: string;
    kode_billing: string;
}

const InputPajakDialog: React.FC<InputPajakDialogProps> = ({
    isOpen,
    onOpenChange,
    tagihan,
    onSuccess
}) => {
    const { user } = useSession();
    const [loading, setLoading] = useState(false);
    const [fetchingPajak, setFetchingPajak] = useState(true);
    const [pajakEntries, setPajakEntries] = useState<PajakEntry[]>([]);

    useEffect(() => {
        if (isOpen && tagihan) {
            fetchExistingPajak();
        } else if (!isOpen) {
            setPajakEntries([]);
        }
    }, [isOpen]); // Only trigger when opening/closing, not when tagihan object updates while open

    const fetchExistingPajak = async () => {
        setFetchingPajak(true);
        try {
            const { data, error } = await supabase
                .from('database_pajak')
                .select('*')
                .eq('id_tagihan', tagihan.id_tagihan);

            if (error) throw error;

            if (data && data.length > 0) {
                setPajakEntries(data.map(d => ({
                    tempId: d.id_pajak, // Use existing ID as key
                    id_pajak: d.id_pajak,
                    jenis_pajak: d.jenis_pajak,
                    kode_akun: d.kode_akun,
                    jumlah_pajak: d.jumlah_pajak.toString(),
                    ntpn: d.ntpn || '',
                    ntb: d.ntb || '',
                    kode_billing: d.kode_billing || '',
                })));
            } else {
                // If no data, initialize with one empty entry
                setPajakEntries([{
                    tempId: Math.random().toString(36).substring(2, 9),
                    jenis_pajak: '',
                    kode_akun: '',
                    jumlah_pajak: '',
                    ntpn: '',
                    ntb: '',
                    kode_billing: '',
                }]);
            }
        } catch (error: any) {
            console.error('Error fetching existing pajak:', error);
            toast.error('Gagal mengambil data pajak yang sudah ada');
        } finally {
            setFetchingPajak(false);
        }
    };

    const addPajakEntry = () => {
        setPajakEntries(prev => [...prev, {
            tempId: Math.random().toString(36).substring(2, 9),
            jenis_pajak: '',
            kode_akun: '',
            jumlah_pajak: '',
            ntpn: '',
            ntb: '',
            kode_billing: '',
        }]);
    };

    const removePajakEntry = (index: number) => {
        setPajakEntries(prev => prev.filter((_, i) => i !== index));
    };

    const updateEntry = (index: number, updates: Partial<PajakEntry>) => {
        setPajakEntries(prev => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], ...updates };

            // Auto-map Kode Akun if Jenis Pajak changes
            if (updates.jenis_pajak) {
                newEntries[index].kode_akun = pajakMapping[updates.jenis_pajak] || '';
            }

            return newEntries;
        });
    };

    const handleSave = async () => {
        // Validation
        const isValid = pajakEntries.every(p => p.jenis_pajak && p.jumlah_pajak && parseFloat(p.jumlah_pajak) > 0);
        if (!isValid) {
            toast.error('Mohon lengkapi Jenis Pajak dan Jumlah Pajak untuk semua entri');
            return;
        }

        setLoading(true);
        try {
            // 1. Delete existing for this tagihan (or we could do upsert, but delete-insert is safer for multi-entry)
            const { error: deleteError } = await supabase
                .from('database_pajak')
                .delete()
                .eq('id_tagihan', tagihan.id_tagihan);

            if (deleteError) {
                console.error('Delete error:', deleteError);
                throw new Error('Gagal membersihkan data pajak lama. Pastikan script RLS sudah dijalankan.');
            }

            // 2. Insert all entries
            const { error: insertError } = await supabase
                .from('database_pajak')
                .insert(pajakEntries.map(p => ({
                    id_tagihan: tagihan.id_tagihan,
                    jenis_pajak: p.jenis_pajak,
                    kode_akun: p.kode_akun,
                    jumlah_pajak: parseFloat(p.jumlah_pajak),
                    ntpn: p.ntpn,
                    ntb: p.ntb,
                    kode_billing: p.kode_billing,
                    id_staf_pajak: user?.id
                })));

            if (insertError) throw insertError;

            // 3. Update status_pajak in database_tagihan
            const { error: updateError } = await supabase
                .from('database_tagihan')
                .update({ status_pajak: 'Selesai' })
                .eq('id_tagihan', tagihan.id_tagihan);

            if (updateError) throw updateError;

            toast.success('Informasi pajak berhasil disimpan');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error saving pajak:', error);
            toast.error('Gagal menyimpan informasi pajak');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                            <ReceiptIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg font-bold">Input Detail Pajak</DialogTitle>
                            <DialogDescription className="text-sm mt-0.5">
                                Masukkan rincian pemotongan pajak tagihan SP2D
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Informasi Tagihan</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 h-5 ml-1">
                                <Building2 className="h-3.5 w-3.5" />
                                NAMA SKPD
                            </Label>
                            <div className="text-sm font-black text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/50 min-h-[44px] flex items-center shadow-sm">
                                {tagihan.nama_skpd}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 h-5 ml-1">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                NILAI BELANJA
                            </Label>
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800/30 min-h-[44px] flex items-center shadow-sm">
                                Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 h-5 ml-1">
                                <FileText className="h-3.5 w-3.5" />
                                NOMOR SPM
                            </Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="text-[13px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/50 cursor-help min-h-[44px] flex items-center shadow-sm overflow-hidden">
                                            <span className="truncate w-full">{tagihan.nomor_spm}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="font-mono text-xs max-w-md break-all">
                                        {tagihan.nomor_spm}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 h-5 ml-1">
                                <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                                NOMOR SP2D
                            </Label>
                            <div className="text-[13px] font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 px-4 py-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 min-h-[50px] flex items-center shadow-sm">
                                {tagihan.nomor_sp2d}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 py-2">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-bold flex items-center gap-2">
                            <CalculatorIcon className="h-4 w-4 text-emerald-500" />
                            Daftar Pemotongan Pajak
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addPajakEntry}
                            className="text-xs h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Tambah Jenis Pajak
                        </Button>
                    </div>

                    {fetchingPajak ? (
                        <div className="h-40 flex items-center justify-center text-slate-500 italic">
                            Memuat data pajak...
                        </div>
                    ) : pajakEntries.map((entry, index) => (
                        <div key={entry.tempId} className="relative p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-4">
                            <div className="absolute -top-3 left-4 px-2 bg-white dark:bg-slate-800 text-[10px] font-black text-emerald-500 border border-emerald-100 rounded-md">
                                PAJAK #{index + 1}
                            </div>

                            {pajakEntries.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-md text-red-500 hover:bg-red-50 border border-red-100"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        removePajakEntry(index);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Jenis Pajak</Label>
                                    <Select
                                        value={entry.jenis_pajak}
                                        onValueChange={(val) => updateEntry(index, { jenis_pajak: val })}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue placeholder="Pilih Jenis Pajak" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.keys(pajakMapping).map(key => (
                                                <SelectItem key={key} value={key}>{key}</SelectItem>
                                            ))}
                                            <SelectItem value="Lainnya">Lainnya...</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold font-mono">Kode Akun</Label>
                                    <Input
                                        placeholder="Otomatis / Isi Manual"
                                        value={entry.kode_akun}
                                        onChange={(e) => updateEntry(index, { kode_akun: e.target.value })}
                                        className="rounded-xl font-mono bg-slate-50 dark:bg-slate-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Jumlah Pajak (Rp)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={entry.jumlah_pajak}
                                        onChange={(e) => updateEntry(index, { jumlah_pajak: e.target.value })}
                                        className="rounded-xl font-bold text-emerald-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">NTPN (16 Karakter)</Label>
                                    <Input
                                        placeholder="Masukkan NTPN"
                                        value={entry.ntpn}
                                        maxLength={16}
                                        onChange={(e) => updateEntry(index, { ntpn: e.target.value.toUpperCase() })}
                                        className="rounded-xl font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Nomor Transaksi Bank (NTB)</Label>
                                    <Input
                                        placeholder="Masukkan NTB"
                                        value={entry.ntb}
                                        onChange={(e) => updateEntry(index, { ntb: e.target.value.toUpperCase() })}
                                        className="rounded-xl font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold">Kode Billing</Label>
                                    <Input
                                        placeholder="Masukkan Kode Billing"
                                        value={entry.kode_billing}
                                        onChange={(e) => updateEntry(index, { kode_billing: e.target.value })}
                                        className="rounded-xl font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                        Pastikan data NTPN dan NTB sesuai dengan resi penyetoran. Kesalahan input dapat menghambat rekonsiliasi data pajak pusat dan daerah.
                    </p>
                </div>

                <DialogFooter className="mt-8 gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Batal</Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-10 font-bold shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Data Pajak'}
                        <ShieldCheckIcon className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InputPajakDialog;
