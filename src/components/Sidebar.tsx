import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, LayoutDashboardIcon, FileTextIcon, HistoryIcon, ListFilterIcon, UsersIcon, PaletteIcon, ClipboardListIcon, MapPinIcon, ListChecksIcon, CalendarCheckIcon, CoinsIcon } from 'lucide-react';
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
  const location = useLocation();
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
        "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-950 dark:to-emerald-950/10 border-r border-emerald-200 dark:border-emerald-900/30 transition-all duration-500 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex items-center justify-center h-16 border-b border-emerald-200 dark:border-emerald-900/30 px-4">
          {!isCollapsed ? (
            <div className="flex items-center gap-2 w-full">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-900 dark:to-teal-900 animate-pulse"></div>
              <div className="h-6 flex-1 bg-gradient-to-r from-emerald-200 to-teal-200 dark:from-emerald-900 dark:to-teal-900 rounded-md animate-pulse"></div>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-900 dark:to-teal-900 animate-pulse"></div>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-950 rounded-lg animate-pulse"></div>
          ))}
        </nav>
      </aside>
    );
  }

  const navItems: SidebarNavItem[] = [];

  if (role === 'SKPD') {
    navItems.push(
      { to: '/dashboard-skpd', icon: LayoutDashboardIcon, label: 'Dashboard' },
      { to: '/portal-skpd', icon: FileTextIcon, label: 'Tagihan' },
      { to: '/riwayat-tagihan', icon: HistoryIcon, label: 'Riwayat Tagihan' },
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
          { to: '/admin/sumber-dana', icon: CoinsIcon, label: 'Sumber Dana' },
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
      "fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-950 dark:to-emerald-950/10 border-r border-emerald-200 dark:border-emerald-900/30 transition-all duration-500 ease-in-out shadow-sm",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-start h-16 border-b border-emerald-200 dark:border-emerald-900/30 px-4 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/30">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="App Logo" className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-md">
                <HomeIcon className="h-6 w-6 text-white" />
              </div>
            )}
            <span className="font-bold text-lg bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">{appName}</span>
          </div>
        ) : (
          <>
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="App Logo" className="h-8 w-8 object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 flex items-center justify-center shadow-md">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
            )}
          </>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item, index) => {
          if ('type' in item && item.type === 'collapsible') {
            if (isCollapsed) {
              return (
                <Link
                  key={item.label}
                  to={item.children[0].to}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center justify-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group",
                    location.pathname === item.children[0].to
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white shadow-md shadow-emerald-500/30"
                      : "text-slate-700 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm"
                  )}
                  title={item.label}
                >
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    location.pathname === item.children[0].to ? "" : "group-hover:scale-110"
                  )} />
                </Link>
              );
            } else {
              return (
                <Accordion key={item.label} type="single" collapsible className="w-full">
                  <AccordionItem value={`item-${index}`} className="border-b-0">
                    <AccordionTrigger className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-700 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:shadow-sm group">
                      <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-3 pt-1">
                      <div className="space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            onClick={onLinkClick}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 group",
                              location.pathname === child.to
                                ? "bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white shadow-md shadow-emerald-500/30"
                                : "text-slate-600 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm"
                            )}
                          >
                            <child.icon className={cn(
                              "h-4 w-4 ml-2 transition-transform duration-200",
                              location.pathname === child.to ? "" : "group-hover:scale-110"
                            )} />
                            <span className="text-sm font-medium">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            }
          } else {
            const navItem = item as NavItem;
            return (
              <Link
                key={navItem.to}
                to={navItem.to}
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 group",
                  location.pathname === navItem.to
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white shadow-md shadow-emerald-500/30"
                    : "text-slate-700 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? navItem.label : undefined}
              >
                <navItem.icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  location.pathname === navItem.to ? "" : "group-hover:scale-110"
                )} />
                <span className={cn("text-sm font-medium", isCollapsed && "hidden")}>{navItem.label}</span>
              </Link>
            );
          }
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;