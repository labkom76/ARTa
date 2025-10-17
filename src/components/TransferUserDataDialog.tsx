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
}

const TransferUserDataDialog: React.FC<TransferUserDataDialogProps> = ({ isOpen, onClose }) => {
  const [skpdUsers, setSkpdUsers] = useState<SkpdUser[]>([]);
  const [selectedFromUser, setSelectedFromUser] = useState<string | null>(null);
  const [selectedToUser, setSelectedToUser] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
      // Reset selections when dialog opens
      setSelectedFromUser(null);
      setSelectedToUser(null);
    }
  }, [isOpen]);

  const isContinueButtonDisabled = !selectedFromUser || !selectedToUser || selectedFromUser === selectedToUser;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Data Antar Pengguna</DialogTitle>
          <DialogDescription>
            Pilih pengguna sumber dan pengguna tujuan untuk mentransfer data.
          </DialogDescription>
        </DialogHeader>
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
                    disabled={user.id === selectedToUser} // Disable if already selected as 'To' user
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
                    disabled={user.id === selectedFromUser} // Disable if already selected as 'From' user
                  >
                    {user.nama_lengkap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={isContinueButtonDisabled}>Lanjutkan</Button> {/* Disabled based on selection */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferUserDataDialog;