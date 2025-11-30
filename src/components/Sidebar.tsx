import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, LayoutDashboardIcon, FileTextIcon, HistoryIcon, ListFilterIcon, UsersIcon, PaletteIcon, ClipboardListIcon, MapPinIcon, ListChecksIcon, CalendarCheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/contexts/SessionContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client'; // Import supabase

interface SidebarProps {
  isCollapsed: boolean;
  onLinkClick?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface CollapsibleNavItem {
  type: 'collapsible';
  label: string;
  icon: React.ElementType;
  children: NavItem[];
}

type SidebarNavItem = NavItem | CollapsibleNavItem;

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onLinkClick }) => {
  const { role, loading } = useSession();
  const [appName, setAppName] = useState('Aplikasi'); // Default app name
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null); // Default app logo
  const [loadingBranding, setLoadingBranding] = useState(true);

  useEffect(() => {
    const fetchBrandingSettings = async () => {
      setLoadingBranding(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['app_name', 'app_logo_url']);

        if (error) throw error;

        const settingsMap = new Map(data.map(item => [item.key, item.value]));
        setAppName(settingsMap.get('app_name') || 'Aplikasi');
        setAppLogoUrl(settingsMap.get('app_logo_url') || null);
      } catch (error: any) {
        console.error('Error fetching branding settings for sidebar:', error.message);
        setAppName('Aplikasi'); // Fallback
        setAppLogoUrl(null); // Fallback
      } finally {
        setLoadingBranding(false);
      }
    };

    fetchBrandingSettings();
  }, []);

  if (loading || loadingBranding) {
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

  const navItems: SidebarNavItem[] = [];

  if (role === 'SKPD') {
    navItems.push(
      { to: '/dashboard-skpd', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-skpd', icon: FileTextIcon, label: 'Tagihan' },
    );
  } else if (role === 'Staf Registrasi') {
    navItems.push(
      { to: '/dashboard-registrasi', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-registrasi', icon: FileTextIcon, label: 'Portal Registrasi' },
      { to: '/riwayat-registrasi', icon: HistoryIcon, label: 'Riwayat Registrasi' },
    );
  } else if (role === 'Staf Verifikator') {
    navItems.push(
      { to: '/dashboard-verifikasi', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-verifikasi', icon: FileTextIcon, label: 'Portal Verifikasi' },
      { to: '/riwayat-verifikasi', icon: HistoryIcon, label: 'Riwayat Verifikasi' },
    );
  } else if (role === 'Staf Koreksi') {
    navItems.push(
      { to: '/dashboard-koreksi', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-verifikasi', icon: FileTextIcon, label: 'Portal Verifikasi' },
      { to: '/rekap-dikembalikan', icon: ListFilterIcon, label: 'Rekap Dikembalikan' },
    );
  } else if (role === 'Administrator') {
    navItems.push(
      { to: '/admin/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard Admin' },
      { to: '/admin/tagihan', icon: ClipboardListIcon, label: 'Manajemen Tagihan' },
      {
        type: 'collapsible',
        label: 'Manajemen',
        icon: UsersIcon, // Icon for the parent 'Manajemen' menu
        children: [
          { to: '/admin/users', icon: UsersIcon, label: 'Pengguna' },
          { to: '/admin/custom-login', icon: PaletteIcon, label: 'Kustom Login' }, // Using PaletteIcon for customization
        ]
      },
      { // New collapsible menu for Data Master
        type: 'collapsible',
        label: 'Data Master',
        icon: ListFilterIcon, // You can choose a more appropriate icon
        children: [
          { to: '/admin/kode-wilayah', icon: MapPinIcon, label: 'Kode Wilayah' }, // New item
          { to: '/admin/kode-skpd', icon: ListChecksIcon, label: 'Kode SKPD' },
          { to: '/admin/jadwal-penganggaran', icon: CalendarCheckIcon, label: 'Jadwal Penganggaran' },
        ]
      },
      { to: '/admin/laporan', icon: HistoryIcon, label: 'Laporan' }, // New "Laporan" menu item
      { to: '/admin/activity-log', icon: FileTextIcon, label: 'Activity Log' }, // NEW: Activity Log item, icon changed to FileTextIcon
    );
  } else {
    navItems.push(
      { to: '/', icon: HomeIcon, label: 'Home' },
    );
  }

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-sidebar dark:bg-sidebar-background border-r border-sidebar-border dark:border-sidebar-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-start h-16 border-b border-sidebar-border dark:border-sidebar-border px-4">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="App Logo" className="h-10 object-contain" />
            ) : (
              // Placeholder to maintain spacing if no logo
              <div className="h-10 w-10 flex-shrink-0"></div> 
            )}
            <span className="font-bold text-xl text-sidebar-primary dark:text-sidebar-primary-foreground">{appName}</span>
          </div>
        ) : (
          <>
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="App Logo" className="h-8 w-8 object-contain" />
            ) : (
              <HomeIcon className="h-6 w-6 text-sidebar-primary dark:text-sidebar-primary-foreground" />
            )}
          </>
        )}
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item, index) => {
          if ('type' in item && item.type === 'collapsible') {
            if (isCollapsed) {
              return (
                <Link
                  key={item.label}
                  to={item.children[0].to}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center justify-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors duration-200",
                  )}
                  title={item.label}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              );
            } else {
              return (
                <Accordion key={item.label} type="single" collapsible className="w-full">
                  <AccordionItem value={`item-${index}`} className="border-b-0">
                    <AccordionTrigger className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors duration-200">
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm flex-1 text-left">{item.label}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-3">
                      <div className="space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            onClick={onLinkClick}
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors duration-200"
                          >
                            <child.icon className="h-4 w-4 ml-2" />
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            }
          } else {
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground dark:text-sidebar-foreground hover:bg-sidebar-accent dark:hover:bg-sidebar-accent hover:text-sidebar-accent-foreground dark:hover:text-sidebar-accent-foreground transition-colors duration-200",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span className={cn("text-sm", isCollapsed && "hidden")}>{item.label}</span>
              </Link>
            );
          }
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;