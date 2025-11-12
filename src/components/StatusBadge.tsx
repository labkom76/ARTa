import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TriangleAlertIcon, InfoIcon, CheckCircleIcon, XCircleIcon, FilePenLine } from 'lucide-react'; // Import FilePenLine icon
import { cn } from '@/lib/utils'; // Import cn for class merging

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'error' | undefined; // Remove 'review-needed' from here
  let IconComponent: React.ElementType | null = null;
  let customClasses = ''; // New variable for custom classes

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
    case 'Tinjau Kembali': // NEW: Case for 'Tinjau Kembali'
      variant = undefined; // No standard variant, apply custom classes directly
      IconComponent = FilePenLine;
      customClasses = 'bg-[#8338ec] text-white'; // Direct Tailwind classes for background and text
      break;
    default:
      variant = 'default'; // Fallback for unknown statuses
      IconComponent = null; // No icon for default
      break;
  }

  return (
    <Badge variant={variant} className={cn("flex items-center gap-1", customClasses)}> {/* Apply customClasses here */}
      {IconComponent && <IconComponent className="h-3.5 w-3.5" />} {/* Render icon if available */}
      {status}
    </Badge>
  );
};

export default StatusBadge;