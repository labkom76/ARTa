import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[500px] bg-gradient-to-br from-white to-red-50/30 dark:from-slate-900 dark:to-red-950/20 border-red-200 dark:border-red-900/30">
        <AlertDialogHeader className="border-b border-red-100 dark:border-red-900/30 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-4 gap-2 sm:gap-2">
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              onClick={onClose}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white gap-2 transition-all shadow-sm hover:shadow-md"
            >
              <Trash2 className="h-4 w-4" />
              Hapus
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConfirmationDialog;