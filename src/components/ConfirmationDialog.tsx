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
import { AlertCircle, LucideIcon } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    confirmIcon?: LucideIcon;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    confirmIcon: ConfirmIcon = AlertCircle,
    variant = 'default',
}) => {
    // Define color schemes based on variant
    const variantStyles = {
        default: {
            bg: 'from-white to-slate-50/30 dark:from-slate-900 dark:to-slate-950/20',
            border: 'border-slate-200 dark:border-slate-800',
            iconBg: 'bg-slate-100 dark:bg-slate-800',
            iconColor: 'text-slate-600 dark:text-slate-400',
            buttonBg: 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-700',
            headerBorder: 'border-slate-100 dark:border-slate-800',
        },
        destructive: {
            bg: 'from-white to-red-50/30 dark:from-slate-900 dark:to-red-950/20',
            border: 'border-red-200 dark:border-red-900/30',
            iconBg: 'bg-red-100 dark:bg-red-950/50',
            iconColor: 'text-red-600 dark:text-red-400',
            buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
            headerBorder: 'border-red-100 dark:border-red-900/30',
        },
        success: {
            bg: 'from-white to-green-50/30 dark:from-slate-900 dark:to-green-950/20',
            border: 'border-green-200 dark:border-green-900/30',
            iconBg: 'bg-green-100 dark:bg-green-950/50',
            iconColor: 'text-green-600 dark:text-green-400',
            buttonBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700',
            headerBorder: 'border-green-100 dark:border-green-900/30',
        },
        warning: {
            bg: 'from-white to-orange-50/30 dark:from-slate-900 dark:to-orange-950/20',
            border: 'border-orange-200 dark:border-orange-900/30',
            iconBg: 'bg-orange-100 dark:bg-orange-950/50',
            iconColor: 'text-orange-600 dark:text-orange-400',
            buttonBg: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700',
            headerBorder: 'border-orange-100 dark:border-orange-900/30',
        },
    };

    const styles = variantStyles[variant];

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className={`sm:max-w-[500px] bg-gradient-to-br ${styles.bg} ${styles.border}`}>
                <AlertDialogHeader className={`border-b ${styles.headerBorder} pb-4`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 ${styles.iconBg} rounded-lg`}>
                            <ConfirmIcon className={`h-6 w-6 ${styles.iconColor}`} />
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
                            onClick={onConfirm}
                            className={`${styles.buttonBg} text-white gap-2 transition-all shadow-sm hover:shadow-md`}
                        >
                            <ConfirmIcon className="h-4 w-4" />
                            {confirmText}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmationDialog;
