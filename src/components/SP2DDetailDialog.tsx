import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Landmark, Calendar, FileText, Building2, DollarSign, AlertCircle, Hash, Receipt } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Tagihan } from '@/types/tagihan';

interface SP2DDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tagihan: Tagihan | null;
}

const SP2DDetailDialog: React.FC<SP2DDetailDialogProps> = ({
    isOpen,
    onClose,
    tagihan,
}) => {
    if (!tagihan) return null;

    // Extract logic consistent with Registry
    const parts = tagihan.nomor_spm ? tagihan.nomor_spm.split('/') : [];
    const extractedNoSp2d = parts.length > 2 ? parts[2].padStart(6, '0') : '-';

    const mIndex = tagihan.nomor_spm ? tagihan.nomor_spm.indexOf('/M/') : -1;
    const extractedKodeSp2d = mIndex !== -1 ? tagihan.nomor_spm.substring(mIndex) : '-';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-emerald-950/20">
                <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/30 pb-4 pr-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Landmark className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                Detail Registrasi SP2D
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-600 dark:text-slate-400">
                            Informasi lengkap penerbitan dokumen SP2D
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* SECTION: IDENTITAS SP2D */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Identitas SP2D</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 min-h-[40px] flex items-center font-mono">
                                    {extractedNoSp2d}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Receipt className="h-3.5 w-3.5" />
                                    Kode SP2D
                                </Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center font-mono">
                                    {extractedKodeSp2d}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: DETAIL TAGIHAN */}
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
                                    Jumlah
                                </Label>
                                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800/50 min-h-[40px] flex items-center">
                                    Rp{tagihan.jumlah_kotor.toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: PERBANKAN & BSG */}
                    <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Perbankan & BSG</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Landmark className="h-3.5 w-3.5" />
                                    Nama Bank
                                </Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.nama_bank || '-'}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 h-5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Tgl. Diserahkan ke BSG
                                </Label>
                                <div className="text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800/50 min-h-[40px] flex items-center">
                                    {tagihan.tanggal_bsg ? format(parseISO(tagihan.tanggal_bsg), 'dd MMMM yyyy', { locale: id }) : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: CATATAN */}
                    {tagihan.catatan_sp2d && (
                        <div className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Catatan Koreksi</h3>
                            </div>

                            <div className="text-sm text-slate-700 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50 leading-relaxed">
                                {tagihan.catatan_sp2d}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default SP2DDetailDialog;
