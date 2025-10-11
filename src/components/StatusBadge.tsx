import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TriangleAlertIcon, InfoIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react'; // Import icons

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'error';
  let IconComponent: React.ElementType | null = null;

  switch (status) {
    case 'Menunggu Registrasi':
      variant = 'warning';
      IconComponent = TriangleAlertIcon;
      break;
    case 'Menunggu Verifikasi':
      variant = 'info';
      IconComponent = InfoIcon;
      break;
    case 'Diteruskan':
      variant = 'success';
      IconComponent = CheckCircleIcon;
      break;
    case 'Dikembalikan':
      variant = 'error';
      IconComponent = XCircleIcon;
      break;
    default:
      variant = 'default'; // Fallback for unknown statuses
      IconComponent = null; // No icon for default
      break;
  }

  return (
    <Badge variant={variant} className="flex items-center gap-1"> {/* Added flex and gap for icon spacing */}
      {IconComponent && <IconComponent className="h-3.5 w-3.5" />} {/* Render icon if available */}
      {status}
    </Badge>
  );
};

export default StatusBadge;