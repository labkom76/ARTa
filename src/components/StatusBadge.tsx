import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TriangleAlertIcon, InfoIcon, CheckCircleIcon, XCircleIcon, FilePenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'error' | undefined;
  let IconComponent: React.ElementType | null = null;
  let customClasses = '';

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
    case 'Tinjau Kembali':
      variant = undefined;
      IconComponent = FilePenLine;
      customClasses = 'bg-[#8338ec] text-white';
      break;
    case 'Selesai':
      variant = 'info';
      IconComponent = CheckCircleIcon;
      customClasses = 'bg-blue-600 text-white';
      break;
    default:
      variant = 'default';
      IconComponent = null;
      break;
  }

  return (
    <Badge variant={variant} className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium", customClasses)}>
      {IconComponent && <IconComponent className="h-3 w-3" />}
      <span>{status}</span>
    </Badge>
  );
};

export default StatusBadge;