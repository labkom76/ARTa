import React from 'react';
import { getBankColor } from '@/utils/bankColors';
import { cn } from '@/lib/utils';

interface BankBadgeProps {
    bankName: string | null | undefined;
    className?: string;
}

export const BankBadge: React.FC<BankBadgeProps> = ({ bankName, className }) => {
    if (!bankName) {
        return <span className="text-xs text-slate-400">-</span>;
    }

    const colors = getBankColor(bankName);

    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border',
                colors.bg,
                colors.text,
                colors.border,
                className
            )}
        >
            {bankName}
        </span>
    );
};
