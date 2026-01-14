import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from '@/components/ui/label';
import { Landmark, Calendar, FileText, Building2, DollarSign, AlertCircle, Hash, Receipt, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Tagihan } from '@/types/tagihan';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

interface PajakDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tagihan: Tagihan | null;
    pajakList: any[];
}

const PajakDetailDialog: React.FC<PajakDetailDialogProps> = ({
    isOpen,
    onClose,
    tagihan,
    pajakList,
}) => {
    if (!tagihan) return null;

    // Total pajak calculation
    const totalPajak = pajakList.reduce((sum, p) => sum + (parseFloat(p.jumlah_pajak) || 0), 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
                <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                Detail Tagihan & Pajak
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Rincian tagihan yang sudah diproses datanya oleh Staf Pajak
                        </DialogDescription>
                        <div className="mt-1 flex flex-wrap gap-2">
                            <div className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-lg shadow-sm">
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                                    SPM: {tagihan.nomor_spm}
                                </span>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* SECTION: IDENTITAS SP2D */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Identitas SP2D</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Tgl. SP2D
                                </Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.tanggal_sp2d ? format(parseISO(tagihan.tanggal_sp2d), 'dd MMMM yyyy', { locale: id }) : '-'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Hash className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    No. SP2D
                                </Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 min-h-[40px] flex items-center font-mono uppercase truncate cursor-help max-w-full overflow-hidden">
                                                {tagihan.nomor_sp2d || '-'}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[400px] break-all">
                                            <p className="font-mono text-xs">{tagihan.nomor_sp2d}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: DATA TAGIHAN */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Data Tagihan & SKPD</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Building2 className="h-3.5 w-3.5" />
                                    S K P D
                                </Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.nama_skpd}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Jenis
                                </Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.jenis_tagihan}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Uraian
                                </Label>
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[60px] flex items-start leading-relaxed">
                                    {tagihan.uraian}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Nilai Belanja
                                </Label>
                                <div className="text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: RINCIAN PAJAK */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>

                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Rincian Pajak</h3>
                            </div>
                            <div className="text-xs font-bold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-800">
                                {pajakList.length} Entri Pajak
                            </div>
                        </div>

                        <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/50 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-emerald-50/50 dark:bg-emerald-950/30">
                                    <TableRow className="hover:bg-transparent border-emerald-100 dark:border-emerald-900/50">
                                        <TableHead className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Jenis Pajak</TableHead>
                                        <TableHead className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Kode Akun</TableHead>
                                        <TableHead className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-400">Kode Billing</TableHead>
                                        <TableHead className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-400">NTB</TableHead>
                                        <TableHead className="text-[11px] uppercase font-bold text-emerald-800 dark:text-emerald-400 text-right">Jumlah</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pajakList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400 italic">
                                                Belum ada rincian pajak untuk tagihan ini.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        pajakList.map((p, idx) => (
                                            <TableRow key={idx} className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 border-emerald-50 dark:border-emerald-900/30">
                                                <TableCell className="font-medium text-slate-900 dark:text-slate-100">{p.jenis_pajak}</TableCell>
                                                <TableCell className="font-mono text-xs">{p.kode_akun}</TableCell>
                                                <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300 uppercase">{p.kode_billing || '-'}</TableCell>
                                                <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300 uppercase">{p.ntb || '-'}</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                    Rp{(parseFloat(p.jumlah_pajak) || 0).toLocaleString('id-ID')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {pajakList.length > 0 && (
                                        <TableRow className="bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/30 font-bold border-t-2 border-emerald-100 dark:border-emerald-900">
                                            <TableCell colSpan={4} className="text-right text-emerald-800 dark:text-emerald-300 uppercase text-[11px]">Total Pajak</TableCell>
                                            <TableCell className="text-right text-emerald-700 dark:text-emerald-300 text-base">
                                                Rp{totalPajak.toLocaleString('id-ID')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* SECTION: CATATAN (Optional) */}
                    {tagihan.catatan_pajak && (
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Catatan Staf Pajak</h3>
                            </div>

                            <div className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-800/50 leading-relaxed italic">
                                {tagihan.catatan_pajak}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PajakDetailDialog;
