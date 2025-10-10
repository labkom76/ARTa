import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'error';

  switch (status) {
    case 'Menunggu Registrasi':
      variant = 'warning';
      break;
    case 'Menunggu Verifikasi':
      variant = 'info';
      break;
    case 'Diteruskan':
      variant = 'success';
      break;
    case 'Dikembalikan':
      variant = 'error';
      break;
    default:
      variant = 'default'; // Fallback for unknown statuses
      break;
  }

  return <Badge variant={variant}>{status}</Badge>;
};

export default StatusBadge;