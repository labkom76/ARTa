import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Tagihan } from '@/types/tagihan';
import { getJenisTagihanCode } from '@/utils/spmGenerator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { toast } from 'sonner';

interface PrintSP2DReportDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    data: Tagihan[];
    nomorSp2dSetting: string;
    filters: {
        month: string;
        year: string;
        skpd: string;
    };
    isAdmin?: boolean;
}

const PrintSP2DReportDialog = ({ isOpen, onOpenChange, data, nomorSp2dSetting, filters, isAdmin }: PrintSP2DReportDialogProps) => {
    const handlePrint = () => {
        window.print();
    };

    // Auto-trigger print when dialog opens
    useEffect(() => {
        if (isOpen && data.length > 0) {
            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, data]);

    const formatNoSP2D = (item: Tagihan) => {
        if (item.nomor_sp2d) return item.nomor_sp2d;
        if (!item.nomor_spm) return '-';

        const parts = item.nomor_spm.split('/');
        if (parts.length < 2) return item.nomor_spm;
        parts[1] = nomorSp2dSetting;
        return parts.join('/');
    };

    const monthLabel = filters.month === 'all' ? 'SEMUA BULAN' : format(new Date(2024, parseInt(filters.month), 1), 'MMMM', { locale: localeId }).toUpperCase();

    // Content to be rendered for printing (Isolated from Modal)
    const PrintContent = () => (
        <div id="print-only-container" style={{ display: 'none' }}>
            <style>
                {`
                    @media print {
                        @page {
                            size: landscape;
                            margin: 15mm;
                        }
                        
                        /* Hide everything normal */
                        body {
                            visibility: hidden;
                            background: white;
                        }

                        /* Reset global styles that might interfere */
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        /* Show only our print container */
                        #print-only-container {
                            visibility: visible !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white;
                            z-index: 9999;
                            display: block !important;
                            font-size: 11px;
                        }

                        /* Typography & Layout */
                        h2 { font-size: 14pt; font-weight: bold; text-decoration: underline; text-align: center; margin: 0; }
                        p { margin: 2px 0; }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 10px;
                        }
                        
                        th, td {
                            border: 1px solid black;
                            padding: 4px;
                            font-size: 9px;
                        }
                        
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        tr { page-break-inside: avoid; }
                        
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        .font-bold { font-weight: bold; }
                        .uppercase { text-transform: uppercase; }
                        .whitespace-nowrap { white-space: nowrap; }
                    }
                `}
            </style>

            <div className="text-center mb-4">
                <h2 className="uppercase">DAFTAR REGISTRASI PENERBITAN SP2D</h2>
                <p className="font-bold uppercase text-[12pt]">KABUPATEN GORONTALO</p>
                <p className="font-bold uppercase">TAHUN ANGGARAN {filters.year}</p>
                <p className="font-medium mt-2 uppercase">PERIODE: {monthLabel}</p>
                {filters.skpd !== 'Semua SKPD' && <p className="font-medium uppercase font-bold">SKPD: {filters.skpd}</p>}
            </div>

            <table>
                <thead>
                    <tr className="bg-slate-100">
                        <th className="font-bold w-[30px]">NO. REG</th>
                        <th className="font-bold w-[60px]">TGL. SP2D</th>
                        <th className="font-bold w-[180px]">NO. SP2D</th>
                        <th className="font-bold w-[40px]">JENIS</th>
                        <th className="font-bold w-[120px]">SKPD</th>
                        <th className="font-bold">URAIAN</th>
                        <th className="font-bold w-[100px]">JUMLAH (Rp)</th>
                        <th className="font-bold w-[80px]">NAMA BANK</th>
                        <th className="font-bold w-[60px]">TGL. SERAH BSG</th>
                        <th className="font-bold w-[120px]">{isAdmin ? 'SUMBER DANA' : 'CATATAN'}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="p-4 text-center">Tidak ada data ditemukan untuk periode ini.</td>
                        </tr>
                    ) : (
                        data.map((item) => (
                            <tr key={item.id_tagihan}>
                                <td className="text-center font-bold">{item.nomor_urut_sp2d}</td>
                                <td className="text-center whitespace-nowrap">
                                    {item.tanggal_sp2d ? format(parseISO(item.tanggal_sp2d), 'dd/MM/yyyy') : '-'}
                                </td>
                                <td className="font-bold break-all">
                                    {formatNoSP2D(item)}
                                </td>
                                <td className="text-center font-bold">
                                    {getJenisTagihanCode(item.jenis_tagihan)}
                                </td>
                                <td className="font-bold">{item.nama_skpd}</td>
                                <td className="text-[9px] leading-tight text-left">{item.uraian}</td>
                                <td className="text-right font-bold whitespace-nowrap">
                                    {new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}
                                </td>
                                <td className="text-center font-bold uppercase">{item.nama_bank || '-'}</td>
                                <td className="text-center">
                                    {item.tanggal_bsg ? format(parseISO(item.tanggal_bsg), 'dd/MM/yyyy') : '-'}
                                </td>
                                <td className={`text-[9px] leading-tight text-left ${isAdmin ? '' : 'italic'}`}>
                                    {isAdmin ? (item.sumber_dana || '-') : (item.catatan_sp2d || '-')}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot>
                        <tr className="bg-slate-50 font-bold">
                            <td colSpan={6} className="p-2 text-right uppercase">TOTAL KESELURUHAN</td>
                            <td className="p-2 text-right">
                                {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                            </td>
                            <td colSpan={3} className=""></td>
                        </tr>
                    </tfoot>
                )}
            </table>

            <div className="mt-4 flex justify-between text-[9px] italic">
                <span>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: localeId })}</span>
                <span>Jumlah Data: {data.length} baris</span>
            </div>
        </div>
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                <Printer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <DialogTitle className="text-lg font-bold">Preview Laporan Registrasi SP2D</DialogTitle>
                        </div>
                        <div className="flex items-center gap-2 mr-8">
                            <Button
                                onClick={handlePrint}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 h-9"
                                disabled={data.length === 0}
                            >
                                <Printer className="h-4 w-4" />
                                Cetak Laporan
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Preview Content - Only visible on Screen */}
                    <div className="flex-1 overflow-auto p-8 bg-slate-100 dark:bg-slate-950/30 scrollbar-thin print:hidden">
                        <div className="bg-white text-black p-[20mm] shadow-sm min-h-[297mm] w-full mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {/* Duplicate content for Preview - kept simple for display */}
                            <div className="text-center mb-8">
                                <h2 className="text-[20px] font-bold underline m-0 p-0 uppercase">DAFTAR REGISTRASI PENERBITAN SP2D</h2>
                                <p className="text-[14px] font-bold m-[3px_0] uppercase">KABUPATEN GORONTALO</p>
                                <p className="text-[14px] font-bold m-[3px_0] uppercase">TAHUN ANGGARAN {filters.year}</p>
                                <p className="text-[12px] font-medium mt-2 uppercase">PERIODE: {monthLabel}</p>
                                {filters.skpd !== 'Semua SKPD' && <p className="text-[12px] font-medium uppercase font-bold">SKPD: {filters.skpd}</p>}
                            </div>
                            <table className="w-full border-collapse border border-black text-[10px]">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border border-black p-1.5 align-middle text-center uppercase font-bold w-[40px]">NO. REG</th>
                                        <th className="border border-black p-1.5 align-middle text-center uppercase font-bold w-[80px]">TGL. SP2D</th>
                                        <th className="border border-black p-1.5 align-middle text-left uppercase font-bold w-[220px]">NO. SP2D</th>
                                        <th className="border border-black p-1.5 align-middle text-center uppercase font-bold w-[50px]">JENIS</th>
                                        <th className="border border-black p-1.5 align-middle text-left uppercase font-bold w-[150px]">SKPD</th>
                                        <th className="border border-black p-1.5 align-middle text-left uppercase font-bold">URAIAN</th>
                                        <th className="border border-black p-1.5 align-middle text-right uppercase font-bold w-[110px]">JUMLAH (Rp)</th>
                                        <th className="border border-black p-1.5 align-middle text-center uppercase font-bold w-[100px]">NAMA BANK</th>
                                        <th className="border border-black p-1.5 align-middle text-center uppercase font-bold w-[85px]">TGL. SERAH BSG</th>
                                        <th className="border border-black p-1.5 align-middle text-left uppercase font-bold w-[150px]">{isAdmin ? 'SUMBER DANA' : 'CATATAN'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="border border-black p-4 text-center">Tidak ada data ditemukan untuk periode ini.</td>
                                        </tr>
                                    ) : (
                                        data.map((item) => (
                                            <tr key={item.id_tagihan}>
                                                <td className="border border-black p-1.5 text-center font-bold min-h-[40px]">{item.nomor_urut_sp2d}</td>
                                                <td className="border border-black p-1.5 text-center whitespace-nowrap">
                                                    {item.tanggal_sp2d ? format(parseISO(item.tanggal_sp2d), 'dd/MM/yyyy') : '-'}
                                                </td>
                                                <td className="border border-black p-1.5 font-bold break-all">
                                                    {formatNoSP2D(item)}
                                                </td>
                                                <td className="border border-black p-1.5 text-center font-bold">
                                                    {getJenisTagihanCode(item.jenis_tagihan)}
                                                </td>
                                                <td className="border border-black p-1.5 font-bold">{item.nama_skpd}</td>
                                                <td className="border border-black p-1.5 text-[9px] leading-tight">{item.uraian}</td>
                                                <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap">
                                                    {new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}
                                                </td>
                                                <td className="border border-black p-1.5 text-center font-bold uppercase">{item.nama_bank || '-'}</td>
                                                <td className="border border-black p-1.5 text-center">
                                                    {item.tanggal_bsg ? format(parseISO(item.tanggal_bsg), 'dd/MM/yyyy') : '-'}
                                                </td>
                                                <td className={`border border-black p-1.5 text-[9px] leading-tight ${isAdmin ? '' : 'italic'}`}>
                                                    {isAdmin ? (item.sumber_dana || '-') : (item.catatan_sp2d || '-')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {data.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-50 font-bold">
                                            <td colSpan={6} className="border border-black p-2 text-right uppercase">TOTAL KESELURUHAN</td>
                                            <td className="border border-black p-2 text-right">
                                                {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                                            </td>
                                            <td colSpan={3} className="border border-black"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden Print Content via Portal */}
            {isOpen && createPortal(<PrintContent />, document.body)}
        </>
    );
};

export default PrintSP2DReportDialog;
