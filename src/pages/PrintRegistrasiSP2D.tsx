import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Tagihan } from '@/types/tagihan';
import { getJenisTagihanCode } from '@/utils/spmGenerator';

const PrintRegistrasiSP2D = () => {
    const location = useLocation();
    const [data, setData] = useState<Tagihan[]>([]);
    const [loading, setLoading] = useState(true);
    const [nomorSp2dSetting, setNomorSp2dSetting] = useState('04.0');

    // Filter values from URL
    const params = new URLSearchParams(location.search);
    const month = params.get('month') || 'all';
    const year = params.get('year') || new Date().getFullYear().toString();
    const skpd = params.get('skpd') || 'Semua SKPD';
    const search = params.get('search') || '';

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch Setting
                const { data: settingData } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'nomor_sp2d')
                    .single();
                if (settingData) setNomorSp2dSetting(settingData.value);

                // Fetch Main Data
                let startDateStr: string;
                let endDateStr: string;

                if (month !== 'all') {
                    startDateStr = format(new Date(parseInt(year), parseInt(month), 1), 'yyyy-MM-dd');
                    endDateStr = format(new Date(parseInt(year), parseInt(month) + 1, 0), 'yyyy-MM-dd');
                } else {
                    startDateStr = format(new Date(parseInt(year), 0, 1), 'yyyy-MM-dd');
                    endDateStr = format(new Date(parseInt(year), 11, 31), 'yyyy-MM-dd');
                }

                let query = supabase
                    .from('database_tagihan')
                    .select('*')
                    .eq('status_tagihan', 'Selesai')
                    .gte('tanggal_sp2d', startDateStr)
                    .lte('tanggal_sp2d', endDateStr)
                    .order('nomor_urut_sp2d', { ascending: true });

                if (search) {
                    query = query.ilike('nomor_spm', `%${search}%`);
                }
                if (skpd !== 'Semua SKPD') {
                    query = query.eq('nama_skpd', skpd);
                }

                const { data: result, error } = await query;
                if (error) throw error;
                setData(result as Tagihan[]);
            } catch (error) {
                console.error('Error fetching print data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [location.search]);

    useEffect(() => {
        if (!loading && data.length > 0) {
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, data]);

    const formatNoSP2D = (item: Tagihan) => {
        if (item.nomor_sp2d) return item.nomor_sp2d;
        if (!item.nomor_spm) return '-';

        const parts = item.nomor_spm.split('/');
        if (parts.length < 2) return item.nomor_spm;
        parts[1] = nomorSp2dSetting;
        return parts.join('/');
    };

    if (loading) return <div className="p-8 text-center font-bold">Memasok data laporan...</div>;

    const monthLabel = month === 'all' ? 'SEMUA BULAN' : format(new Date(2024, parseInt(month), 1), 'MMMM', { locale: localeId }).toUpperCase();

    return (
        <div className="print-container p-4 min-h-screen bg-white text-black font-sans">
            <style>
                {`
                @media print {
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    font-size: 10px;
                    font-family: Arial, sans-serif;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 5px 3px;
                    vertical-align: middle;
                }
                th {
                    background-color: #f2f2f2 !important;
                    font-weight: bold;
                    text-align: center;
                    text-transform: uppercase;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .header-title {
                    text-align: center;
                    margin-bottom: 25px;
                    font-family: Arial, sans-serif;
                }
                .header-title h2 {
                    font-size: 20px;
                    margin: 0;
                    padding: 0;
                    text-decoration: underline;
                }
                .header-title p {
                    font-size: 14px;
                    margin: 3px 0;
                    font-weight: bold;
                }
                .footer-info {
                    margin-top: 20px;
                    font-size: 10px;
                    display: flex;
                    justify-content: space-between;
                    font-style: italic;
                }
                `}
            </style>

            <div className="header-title">
                <h2>DAFTAR REGISTRASI PENERBITAN SP2D</h2>
                <p>KABUPATEN GORONTALO</p>
                <p>TAHUN ANGGARAN {year}</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>PERIODE: {monthLabel}</p>
                {skpd !== 'Semua SKPD' && <p style={{ fontSize: '12px' }}>SKPD: {skpd}</p>}
            </div>

            <table>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>NO. REG</th>
                        <th style={{ width: '80px' }}>TGL. SP2D</th>
                        <th style={{ width: '220px' }}>NO. SP2D</th>
                        <th style={{ width: '50px' }}>JENIS</th>
                        <th style={{ width: '150px' }}>SKPD</th>
                        <th>URAIAN</th>
                        <th style={{ width: '110px' }}>JUMLAH (Rp)</th>
                        <th style={{ width: '100px' }}>NAMA BANK</th>
                        <th style={{ width: '85px' }}>TGL. SERAH BSG</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="text-center p-4">Tidak ada data ditemukan untuk periode ini.</td>
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
                                <td style={{ fontSize: '10px' }}>{item.uraian}</td>
                                <td className="text-right font-bold">
                                    {new Intl.NumberFormat('id-ID').format(item.jumlah_kotor)}
                                </td>
                                <td className="text-center font-bold uppercase">{item.nama_bank || '-'}</td>
                                <td className="text-center">
                                    {item.tanggal_bsg ? format(parseISO(item.tanggal_bsg), 'dd/MM/yyyy') : '-'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                {data.length > 0 && (
                    <tfoot>
                        <tr>
                            <th colSpan={6} className="text-right p-2">TOTAL KESELURUHAN</th>
                            <th className="text-right p-2">
                                {new Intl.NumberFormat('id-ID').format(data.reduce((sum, item) => sum + (item.jumlah_kotor || 0), 0))}
                            </th>
                            <th colSpan={2}></th>
                        </tr>
                    </tfoot>
                )}
            </table>

            <div className="footer-info">
                <span>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm:ss', { locale: localeId })}</span>
                <span>Jumlah Data: {data.length} baris</span>
            </div>

            <div className="mt-8 flex justify-end no-print">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors"
                >
                    Klik untuk Cetak Ulang
                </button>
            </div>
        </div>
    );
};

export default PrintRegistrasiSP2D;
