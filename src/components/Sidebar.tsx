import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, LayoutDashboardIcon, FileTextIcon, UserIcon, HistoryIcon } from 'lucide-react'; // Import HistoryIcon
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onLinkClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onLinkClick }) => {
  const { role, loading } = useSession();

  if (loading) {
    return (
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-sidebar dark:bg-sidebar-background border-r border-sidebar-border dark:border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex items-center justify-center h-16 border-b border-sidebar-border dark:border-sidebar-border">
          <span className={cn("font-bold text-xl text-sidebar-primary dark:text-sidebar-primary-foreground", isCollapsed && "hidden")}>Loading...</span>
          <HomeIcon className={cn("h-6 w-6 text-sidebar-primary dark:text-sidebar-primary-foreground", !isCollapsed && "hidden")} />
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {/* Skeleton for loading state */}
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </nav>
      </aside>
    );
  }

  const navItems = [];

  if (role === 'SKPD') {
    navItems.push(
      { to: '/dashboard-skpd', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-skpd', icon: FileTextIcon, label: 'Tagihan' },
    );
  } else if (role === 'Staf Registrasi') {
    navItems.push(
      { to: '/dashboard-registrasi', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-registrasi', icon: FileTextIcon, label: 'Portal' },
      { to: '/riwayat-registrasi', icon: HistoryIcon, label: 'Riwayat Registrasi' }, // New navigation item
    );
  } else if (role === 'Staf Verifikator') {
    navItems.push(
      { to: '/dashboard-verifikasi', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-verifikasi', icon: FileTextIcon, label: 'Portal' },
    );
  } else {
    // Default or fallback for other roles/unassigned
    navItems.push(
      { to: '/', icon: HomeIcon, label: 'Home' },
    );
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-sidebar dark:bg-sidebar-background border-r border-sidebar-border dark:border-sidebar-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-center h-16 border-b border-sidebar-border dark:border-sidebar-border">
        <span className={cn("font-bold text-xl text-sidebar-primary dark:text-sidebar-primary-foreground", isCollapsed && "hidden")}>Aplikasi</span>
        <HomeIcon className={cn("h-6 w-6 text-sidebar-primary dark:text-sidebar-primary-foreground", !isCollapsed && "hidden")} />
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors duration-200",
              isCollapsed && "justify-center"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className={cn("text-sm", isCollapsed && "hidden")}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;