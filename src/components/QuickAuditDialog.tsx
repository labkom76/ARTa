import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { HistoryIcon, UserIcon, ClockIcon, InfoIcon, ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

interface QuickAuditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tagihanId: string | null;
    nomorSpm: string | null;
}

interface ActivityLogItem {
    id: string;
    created_at: string;
    user_role: string | null;
    action: string;
    details: Record<string, any> | null;
    profiles: {
        nama_lengkap: string | null;
    } | null;
}

const QuickAuditDialog = ({ isOpen, onClose, tagihanId, nomorSpm }: QuickAuditDialogProps) => {
    const [logs, setLogs] = useState<ActivityLogItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!tagihanId || !isOpen) return;

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('activity_log')
                    .select('id, created_at, user_role, action, details, profiles(nama_lengkap)')
                    .eq('tagihan_terkait', tagihanId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setLogs(data as any[] || []);
            } catch (error) {
                console.error('Error fetching audit logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [tagihanId, isOpen]);

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'TAGIHAN_CREATED': return 'Dibuat';
            case 'TAGIHAN_UPDATED': return 'Diedit';
            case 'STATUS_CHANGED': return 'Perubahan Status';
            default: return action;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'TAGIHAN_CREATED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'TAGIHAN_UPDATED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'STATUS_CHANGED': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl">
                <DialogHeader className="p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                            <HistoryIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                Riwayat Jejak Audit
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-0.5">
                                Nomor SPM: <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{nomorSpm}</span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-1 max-h-[65vh]">
                        <div className="p-6 pb-12">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 rounded-full border-2 border-emerald-200 dark:border-emerald-900"></div>
                                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat riwayat...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                                    <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-900">
                                        <InfoIcon className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                                    </div>
                                    <div>
                                        <p className="text-slate-600 dark:text-slate-400 font-medium">Belum ada riwayat aktivitas</p>
                                        <p className="text-xs text-slate-400 mt-1">Aktivitas baru akan tercatat secara otomatis.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-slate-200 before:to-slate-200 dark:before:via-slate-800 dark:before:to-slate-800">
                                    {logs.map((log, index) => (
                                        <div key={log.id} className="relative flex items-start gap-6 group">
                                            <div className="absolute left-0 mt-1.5 w-10 h-10 rounded-full bg-white dark:bg-slate-950 border-2 border-emerald-500 flex items-center justify-center z-10 shadow-sm group-hover:scale-110 transition-transform">
                                                <ClockIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex-1 ml-10 space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`font-semibold border-none ${getActionColor(log.action)}`}>
                                                            {getActionLabel(log.action)}
                                                        </Badge>
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                            {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: localeId })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 group-hover:border-emerald-200 dark:group-hover:border-emerald-900/30 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                            {log.profiles?.nama_lengkap || 'Sistem / Anonim'}
                                                        </span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                                            {log.user_role || 'System'}
                                                        </span>
                                                    </div>
                                                    {log.details && (
                                                        <div className="mt-2 text-xs space-y-1">
                                                            {log.details.old_status && log.details.new_status && (
                                                                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                                                    <span className="font-semibold">{log.details.old_status}</span>
                                                                    <ArrowRight className="h-3 w-3" />
                                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{log.details.new_status}</span>
                                                                </p>
                                                            )}
                                                            {log.details.note && (
                                                                <p className="text-slate-500 italic mt-1 border-l-2 border-slate-200 dark:border-slate-800 pl-2">
                                                                    "{log.details.note}"
                                                                </p>
                                                            )}
                                                            {!log.details.old_status && !log.details.note && (
                                                                <p className="text-[10px] text-slate-400 font-mono break-all leading-relaxed">
                                                                    Details: {JSON.stringify(log.details)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <Button variant="outline" size="sm" onClick={onClose} className="h-8">
                        Tutup
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QuickAuditDialog;
