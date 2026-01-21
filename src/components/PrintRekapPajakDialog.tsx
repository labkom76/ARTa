import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface TaxEntry {
    id_pajak: string;
    id_tagihan: string;
    jenis_pajak: string;
    kode_akun: string;
    jumlah_pajak: number;
    ntpn: string;
    ntb: string;
    kode_billing: string;
    nomor_spm: string;
    nomor_sp2d: string;
    nama_skpd: string;
    jumlah_kotor: number;
    tanggal_sp2d: string;
}

interface PrintRekapPajakDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    data: TaxEntry[];
    filters: {
        month: string;
        year: string;
        skpd: string;
    };
}

const months = [
    { value: 'all', label: 'SEMUA BULAN' },
    { value: '0', label: 'JANUARI' },
    { value: '1', label: 'FEBRUARI' },
    { value: '2', label: 'MARET' },
    { value: '3', label: 'APRIL' },
    { value: '4', label: 'MEI' },
    { value: '5', label: 'JUNI' },
    { value: '6', label: 'JULI' },
    { value: '7', label: 'AGUSTUS' },
    { value: '8', label: 'SEPTEMBER' },
    { value: '9', label: 'OKTOBER' },
    { value: '10', label: 'NOVEMBER' },
    { value: '11', label: 'DESEMBER' },
];

const PrintRekapPajakDialog = ({ isOpen, onOpenChange, data, filters }: PrintRekapPajakDialogProps) => {
    const handlePrint = () => {
        window.print();
    };

    useEffect(() => {
        if (isOpen && data.length > 0) {
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, data]);

    const monthLabel = filters.month === 'all' ? 'SEMUA BULAN' : months.find(m => m.value === filters.month)?.label || '';

    const PrintContent = () => (
        <div id="print-only-rekap-pajak" style={{ display: 'none' }}>
            <style>
                {`
                    @media print {
                        @page {
                            size: landscape;
                            margin: 10mm;
                        }
                        
                        body {
                            visibility: hidden;
                            background: white;
                        }

                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        #print-only-rekap-pajak {
                            visibility: visible !important;
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            background: white;
                            z-index: 9999;
                            display: block !important;
                            font-size: 10px;
                        }

                        h2 { font-size: 14pt; font-weight: bold; text-decoration: underline; text-align: center; margin: 0; }
                        p { margin: 2px 0; font-size: 10pt; }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                        }
                        
                        th, td {
                            border: 1px solid black;
                            padding: 4px;
                            font-size: 8px;
                        }
                        
                        th { background-color: #f1f5f9 !important; font-weight: bold; }
                        
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        tr { page-break-inside: avoid; }
                        
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                    }
                `}
            </style>

            <div className="text-center mb-4">
                <h2 className="uppercase">DAFTAR REKAPITULASI PEMOTONGAN/PENYETORAN PAJAK</h2>
                <p className="font-bold uppercase">KABUPATEN GORONTALO</p>
                <p className="font-bold uppercase">TAHUN ANGGARAN {filters.year}</p>
                <p className="font-medium mt-1 uppercase">PERIODE: {monthLabel}</p>
                {filters.skpd !== 'Semua SKPD' && <p className="font-bold uppercase">SKPD: {filters.skpd}</p>}
            </div>

            <table>
                <thead>
                    <tr>
                        <th className="w-[30px]">NO.</th>
                        <th>SKPD</th>
                        <th className="w-[120px]">NO. SPM</th>
                        <th className="w-[80px]">NILAI BELANJA</th>
                        <th className="w-[120px]">NO. SP2D</th>
                        <th className="w-[80px]">NILAI BELANJA</th>
                        <th className="w-[60px]">KODE AKUN</th>
                        <th className="w-[80px]">JENIS PAJAK</th>
                        <th className="w-[80px]">JUMLAH PAJAK</th>
                        <th className="w-[100px]">NTPN</th>
                        <th className="w-[80px]">NTB</th>
                        <th className="w-[100px]">KODE BILLING</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => (
                        <tr key={item.id_pajak}>
                            <td className="text-center">{idx + 1}</td>
                            <td className="font-bold">{item.nama_skpd}</td>
                            <td className="text-center">{item.nomor_spm}</td>
                            <td className="text-right">{new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}</td>
                            <td className="text-center font-bold">{item.nomor_sp2d}</td>
                            <td className="text-right">{new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}</td>
                            <td className="text-center">{item.kode_akun}</td>
                            <td className="text-center uppercase">{item.jenis_pajak}</td>
                            <td className="text-right font-bold">{new Intl.NumberFormat('id-ID').format(item.jumlah_pajak)}</td>
                            <td className="text-center font-bold">{item.ntpn || '-'}</td>
                            <td className="text-center">{item.ntb || '-'}</td>
                            <td className="text-center">{item.kode_billing || '-'}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-slate-50 font-bold">
                        <td colSpan={3} className="p-2 text-right uppercase">TOTAL</td>
                        <td className="p-2 text-right">
                            {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                        </td>
                        <td></td>
                        <td className="p-2 text-right">
                            {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                        </td>
                        <td colSpan={2}></td>
                        <td className="p-2 text-right">
                            {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_pajak || 0), 0))}
                        </td>
                        <td colSpan={3}></td>
                    </tr>
                </tfoot>
            </table>

            <div className="mt-4 flex justify-between text-[8px] italic">
                <span>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: localeId })}</span>
                <span>Total Data: {data.length} baris</span>
            </div>
        </div>
    );

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-[98vw] w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
                    <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-950/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                                <Printer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <DialogTitle className="text-lg font-bold">Preview Rekapitulasi Pajak</DialogTitle>
                        </div>
                        <div className="flex items-center gap-2 mr-8">
                            <Button
                                onClick={handlePrint}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 h-9 px-6 font-bold"
                                disabled={data.length === 0}
                            >
                                <Printer className="h-4 w-4" />
                                Cetak Sekarang
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto p-4 md:p-10 bg-slate-100 dark:bg-slate-950/30 scrollbar-thin print:hidden">
                        <div className="bg-white text-black p-[15mm] shadow-lg w-full mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
                            <div className="text-center mb-8">
                                <h2 className="text-[22px] font-bold underline m-0 p-0 uppercase">DAFTAR REKAPITULASI PEMOTONGAN/PENYETORAN PAJAK</h2>
                                <p className="text-[14px] font-bold m-[3px_0] uppercase">KABUPATEN GORONTALO</p>
                                <p className="text-[14px] font-bold m-[3px_0] uppercase">TAHUN ANGGARAN {filters.year}</p>
                                <p className="text-[12px] font-medium mt-2 uppercase">PERIODE: {monthLabel}</p>
                                {filters.skpd !== 'Semua SKPD' && <p className="text-[12px] font-bold uppercase mt-1">SKPD: {filters.skpd}</p>}
                            </div>

                            <table className="w-full border-collapse border border-black text-[9px]">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border border-black p-2 text-center font-bold w-[30px]">NO.</th>
                                        <th className="border border-black p-2 text-left font-bold">SKPD</th>
                                        <th className="border border-black p-2 text-center font-bold w-[130px]">NO. SPM</th>
                                        <th className="border border-black p-2 text-right font-bold w-[90px]">NILAI BELANJA</th>
                                        <th className="border border-black p-2 text-center font-bold w-[130px]">NO. SP2D</th>
                                        <th className="border border-black p-2 text-right font-bold w-[90px]">NILAI BELANJA</th>
                                        <th className="border border-black p-2 text-center font-bold w-[60px]">KODE AKUN</th>
                                        <th className="border border-black p-2 text-center font-bold w-[90px]">JENIS PAJAK</th>
                                        <th className="border border-black p-2 text-right font-bold w-[90px]">JUMLAH PAJAK</th>
                                        <th className="border border-black p-2 text-center font-bold w-[110px]">NTPN</th>
                                        <th className="border border-black p-2 text-center font-bold w-[80px]">NTB</th>
                                        <th className="border border-black p-2 text-center font-bold w-[110px]">KODE BILLING</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="border border-black p-8 text-center text-slate-400 font-bold uppercase">Tidak ada data ditemukan</td>
                                        </tr>
                                    ) : (
                                        data.map((item, idx) => (
                                            <tr key={item.id_pajak}>
                                                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                                <td className="border border-black p-1.5 font-bold leading-tight">{item.nama_skpd}</td>
                                                <td className="border border-black p-1.5 text-center font-mono">{item.nomor_spm}</td>
                                                <td className="border border-black p-1.5 text-right font-bold">{new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}</td>
                                                <td className="border border-black p-1.5 text-center font-mono font-bold">{item.nomor_sp2d}</td>
                                                <td className="border border-black p-1.5 text-right font-bold">{new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}</td>
                                                <td className="border border-black p-1.5 text-center font-mono">{item.kode_akun}</td>
                                                <td className="border border-black p-1.5 text-center uppercase font-bold text-[8px]">{item.jenis_pajak}</td>
                                                <td className="border border-black p-1.5 text-right font-bold text-rose-600">{new Intl.NumberFormat('id-ID').format(item.jumlah_pajak)}</td>
                                                <td className="border border-black p-1.5 text-center font-bold font-mono">{item.ntpn || '-'}</td>
                                                <td className="border border-black p-1.5 text-center font-mono">{item.ntb || '-'}</td>
                                                <td className="border border-black p-1.5 text-center font-mono">{item.kode_billing || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {data.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-slate-50 font-bold border-t-2 border-black text-[10px]">
                                            <td colSpan={3} className="border border-black p-2 text-right uppercase">TOTAL</td>
                                            <td className="border border-black p-2 text-right text-emerald-700">
                                                {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                                            </td>
                                            <td className="border border-black"></td>
                                            <td className="border border-black p-2 text-right text-emerald-700">
                                                {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                                            </td>
                                            <td colSpan={2} className="border border-black"></td>
                                            <td className="border border-black p-2 text-right text-rose-700">
                                                {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_pajak || 0), 0))}
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

            {isOpen && createPortal(<PrintContent />, document.body)}
        </>
    );
};

export default PrintRekapPajakDialog;
