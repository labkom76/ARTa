import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { PlusCircleIcon, EditIcon, Trash2Icon, CheckCircleIcon, CoinsIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AddSumberDanaDialog from '@/components/AddSumberDanaDialog';
import EditSumberDanaDialog from '@/components/EditSumberDanaDialog';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';

interface SumberDanaData {
    id: string;
    nama_sumber_dana: string;
    created_at: string;
    is_active: boolean;
}

const AdminSumberDana = () => {
    const { profile, loading: sessionLoading } = useSession();
    const [loadingPage, setLoadingPage] = useState(true);
    const [sumberDanaList, setSumberDanaList] = useState<SumberDanaData[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSumberDana, setEditingSumberDana] = useState<SumberDanaData | null>(null);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [sumberDanaToDelete, setSumberDanaToDelete] = useState<{ id: string; nama: string } | null>(null);

    useEffect(() => {
        if (!sessionLoading) {
            setLoadingPage(false);
        }
    }, [sessionLoading]);

    const fetchSumberDanaData = async () => {
        if (sessionLoading || profile?.peran !== 'Administrator') {
            setLoadingData(false);
            return;
        }

        setLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('master_sumber_dana')
                .select('*')
                .order('nama_sumber_dana', { ascending: true });

            if (error) throw error;
            setSumberDanaList(data as SumberDanaData[]);
        } catch (error: any) {
            console.error('Error fetching sumber dana data:', error.message);
            toast.error('Gagal memuat data sumber dana: ' + error.message);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        fetchSumberDanaData();
    }, [sessionLoading, profile]);

    const handleAddedOrUpdated = () => {
        fetchSumberDanaData();
    };

    const handleEditClick = (data: SumberDanaData) => {
        setEditingSumberDana(data);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (data: SumberDanaData) => {
        setSumberDanaToDelete({ id: data.id, nama: data.nama_sumber_dana });
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!sumberDanaToDelete) return;

        try {
            const { error } = await supabase
                .from('master_sumber_dana')
                .delete()
                .eq('id', sumberDanaToDelete.id);

            if (error) throw error;

            toast.success(`Sumber Dana "${sumberDanaToDelete.nama}" berhasil dihapus.`);
            setIsDeleteDialogOpen(false);
            setSumberDanaToDelete(null);
            fetchSumberDanaData();
        } catch (error: any) {
            console.error('Error deleting sumber dana:', error.message);
            toast.error('Gagal menghapus: ' + error.message);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('master_sumber_dana')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Status berhasil diubah!`);
            fetchSumberDanaData();
        } catch (error: any) {
            console.error('Error toggling status:', error.message);
            toast.error('Gagal mengubah status: ' + error.message);
        }
    };

    if (loadingPage) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-200 dark:border-emerald-900"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 dark:border-emerald-400 border-t-transparent animate-spin"></div>
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Memuat Halaman...
                    </h2>
                </div>
            </div>
        );
    }

    if (profile?.peran !== 'Administrator') {
        return <div className="p-8 text-center text-red-500 font-bold">Akses Ditolak.</div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <CoinsIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                            Master Sumber Dana
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            Kelola daftar pilihan sumber dana untuk input tagihan
                        </p>
                    </div>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                >
                    <PlusCircleIcon className="h-4 w-4 mr-2" /> Tambah Sumber Dana
                </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-lg">
                <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <CardTitle className="text-lg font-bold">Daftar Sumber Dana</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableHead>Nama Sumber Dana</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-center">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingData ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8">Memuat data...</TableCell></TableRow>
                                ) : sumberDanaList.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Tidak ada data ditemukan.</TableCell></TableRow>
                                ) : (
                                    sumberDanaList.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors">
                                            <TableCell className="font-medium">{item.nama_sumber_dana}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant={item.is_active ? "outline" : "ghost"}
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(item.id, item.is_active)}
                                                    className={item.is_active ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-slate-400"}
                                                >
                                                    {item.is_active ? <><CheckCircleIcon className="h-3 w-3 mr-1" /> Aktif</> : "Nonaktif"}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => handleEditClick(item)} className="h-8 w-8">
                                                        <EditIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="outline" size="icon" onClick={() => handleDeleteClick(item)} className="h-8 w-8 text-red-500 hover:text-red-600">
                                                        <Trash2Icon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AddSumberDanaDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSumberDanaAdded={handleAddedOrUpdated}
            />

            <EditSumberDanaDialog
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSumberDanaUpdated={handleAddedOrUpdated}
                editingSumberDana={editingSumberDana}
            />

            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Konfirmasi Penghapusan"
                message={`Apakah Anda yakin ingin menghapus Sumber Dana "${sumberDanaToDelete?.nama}"?`}
            />
        </div>
    );
};

export default AdminSumberDana;
