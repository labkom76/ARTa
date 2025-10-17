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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SkpdUser {
  id: string;
  nama_lengkap: string;
}

interface TransferUserDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess?: () => void; // Optional prop to trigger parent refresh
}

const TransferUserDataDialog: React.FC<TransferUserDataDialogProps> = ({ isOpen, onClose, onTransferSuccess }) => {
  const [skpdUsers, setSkpdUsers] = useState<SkpdUser[]>([]);
  const [selectedFromUser, setSelectedFromUser] = useState<string | null>(null);
  const [selectedToUser, setSelectedToUser] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false); // New state for transfer loading
  const [currentStep, setCurrentStep] = useState<'selection' | 'confirmation'>('selection');

  useEffect(() => {
    const fetchSkpdUsers = async () => {
      if (!isOpen) return;

      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nama_lengkap')
          .eq('peran', 'SKPD')
          .order('nama_lengkap', { ascending: true });

        if (error) throw error;

        setSkpdUsers(data || []);
      } catch (error: any) {
        console.error('Error fetching SKPD users:', error.message);
        toast.error('Gagal memuat daftar pengguna SKPD: ' + error.message);
        setSkpdUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOpen) {
      fetchSkpdUsers();
      // Reset selections and step when dialog opens
      setSelectedFromUser(null);
      setSelectedToUser(null);
      setCurrentStep('selection');
    }
  }, [isOpen]);

  const isContinueButtonDisabled = !selectedFromUser || !selectedToUser || selectedFromUser === selectedToUser;

  const handleContinue = () => {
    if (!isContinueButtonDisabled) {
      setCurrentStep('confirmation');
    }
  };

  const getFromUserName = () => skpdUsers.find(user => user.id === selectedFromUser)?.nama_lengkap || 'Pengguna Sumber';
  const getToUserName = () => skpdUsers.find(user => user.id === selectedToUser)?.nama_lengkap || 'Pengguna Tujuan';

  const handleConfirmTransfer = async () => {
    if (!selectedFromUser || !selectedToUser) {
      toast.error('Pengguna sumber atau tujuan tidak valid.');
      return;
    }

    setIsTransferring(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('transfer-user-data', {
        body: JSON.stringify({ sourceUserId: selectedFromUser, targetUserId: selectedToUser }),
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      toast.success('Data berhasil ditransfer!');
      onClose(); // Close the modal on success
      if (onTransferSuccess) {
        onTransferSuccess(); // Trigger parent refresh if callback is provided
      }
    } catch (error: any) {
      console.error('Error transferring data:', error.message);
      toast.error('Gagal mentransfer data: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Data Antar Pengguna</DialogTitle>
          <DialogDescription>
            {currentStep === 'selection'
              ? 'Pilih pengguna sumber dan pengguna tujuan untuk mentransfer data.'
              : 'Periksa detail transfer di bawah ini.'}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'selection' ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="from-user">Dari Pengguna (Sumber)</Label>
              <Select
                onValueChange={(value) => setSelectedFromUser(value)}
                value={selectedFromUser || ''}
                disabled={loadingUsers}
              >
                <SelectTrigger id="from-user">
                  <SelectValue placeholder="Pilih pengguna sumber" />
                </SelectTrigger>
                <SelectContent>
                  {skpdUsers.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                      disabled={user.id === selectedToUser}
                    >
                      {user.nama_lengkap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="to-user">Kepada Pengguna (Tujuan)</Label>
              <Select
                onValueChange={(value) => setSelectedToUser(value)}
                value={selectedToUser || ''}
                disabled={loadingUsers}
              >
                <SelectTrigger id="to-user">
                  <SelectValue placeholder="Pilih pengguna tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {skpdUsers.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                      disabled={user.id === selectedFromUser}
                    >
                      {user.nama_lengkap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Anda akan memindahkan semua data tagihan dari{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">{getFromUserName()}</span> ke{' '}
              <span className="font-semibold text-blue-600 dark:text-blue-400">{getToUserName()}</span>.
              Aksi ini tidak dapat dibatalkan. Apakah Anda yakin?
            </p>
          </div>
        )}

        <DialogFooter>
          {currentStep === 'selection' ? (
            <>
              <Button variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleContinue} disabled={isContinueButtonDisabled}>Lanjutkan</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setCurrentStep('selection')} disabled={isTransferring}>Batal</Button>
              <Button onClick={handleConfirmTransfer} disabled={isTransferring}>
                {isTransferring ? 'Mentransfer...' : 'Konfirmasi Transfer'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferUserDataDialog;