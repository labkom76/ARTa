import React from 'react';
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

interface TransferUserDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const TransferUserDataDialog: React.FC<TransferUserDataDialogProps> = ({ isOpen, onClose }) => {
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
            <Select disabled> {/* Disabled for now as per instructions */}
              <SelectTrigger id="from-user">
                <SelectValue placeholder="Pilih pengguna sumber" />
              </SelectTrigger>
              <SelectContent>
                {/* Placeholder items */}
                <SelectItem value="user1">Pengguna A</SelectItem>
                <SelectItem value="user2">Pengguna B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="to-user">Kepada Pengguna (Tujuan)</Label>
            <Select disabled> {/* Disabled for now as per instructions */}
              <SelectTrigger id="to-user">
                <SelectValue placeholder="Pilih pengguna tujuan" />
              </SelectTrigger>
              <SelectContent>
                {/* Placeholder items */}
                <SelectItem value="user3">Pengguna C</SelectItem>
                <SelectItem value="user4">Pengguna D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled>Lanjutkan</Button> {/* Disabled for now as per instructions */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferUserDataDialog;