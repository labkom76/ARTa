import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MenuIcon, LogOutIcon, BellIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel, // Import DropdownMenuLabel for titles
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils'; // Import cn for class merging
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import TagihanDetailDialog from '@/components/TagihanDetailDialog'; // Re-import TagihanDetailDialog

// Re-define Tagihan interface or import it from a shared location
// For now, I'll define a minimal one here, but ideally it would be imported.
// Given the context, I'll import from PortalSKPD for consistency.
import { Tagihan } from '@/pages/PortalSKPD';

interface HeaderProps {
  toggleSidebar: () => void;
  isCollapsed?: boolean;
}

interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tagihan_id?: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isCollapsed = false }) => {
  const { profile, user } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate(); // Initialize useNavigate

  // State for TagihanDetailDialog
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTagihanForDetail, setSelectedTagihanForDetail] = useState<Tagihan | null>(null);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, tagihan_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6); // Limit to 6 latest notifications

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          // console.log('Realtime notification change:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Gagal logout: ' + error.message);
    } else {
      toast.success('Anda telah berhasil logout.');
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      // console.log('All unread notifications marked as read.');
    } catch (error: any) {
      console.error('Error marking notifications as read:', error.message);
      toast.error('Gagal menandai notifikasi sudah dibaca: ' + error.message);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
        .eq('is_read', false); // Only update if not already read

      if (error) throw error;
      console.log(`Notification ${notificationId} marked as read.`);
    } catch (error: any) {
      console.error('Error marking single notification as read:', error.message);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!user || !profile) {
      toast.error('Informasi pengguna tidak lengkap.');
      return;
    }
    if (!notification.tagihan_id) {
      toast.info('Detail tagihan tidak tersedia untuk notifikasi ini.');
      return;
    }

    // Mark notification as read
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    if (profile.peran === 'Staf Registrasi') {
      navigate(`/portal-registrasi?open_tagihan=${notification.tagihan_id}`);
    } else if (profile.peran === 'Staf Verifikator') { // NEW: Logic for Staf Verifikator
      navigate(`/portal-verifikasi?open_verifikasi=${notification.tagihan_id}`);
    } else if (profile.peran === 'SKPD') {
      try {
        // Fetch tagihan details for SKPD user
        const { data: tagihanData, error: tagihanError } = await supabase
          .from('database_tagihan')
          .select('*')
          .eq('id_tagihan', notification.tagihan_id)
          .single();

        if (tagihanError) throw tagihanError;
        if (!tagihanData) throw new Error('Tagihan tidak ditemukan.');

        setSelectedTagihanForDetail(tagihanData as Tagihan);
        setIsDetailModalOpen(true);
      } catch (error: any) {
        console.error('Error fetching tagihan details for SKPD:', error.message);
        toast.error('Gagal memuat detail tagihan: ' + error.message);
      }
    } else {
      toast.info('Aksi tidak tersedia untuk peran Anda.');
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-gradient-to-r from-white via-emerald-50/30 to-white dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950 border-b border-gray-200 dark:border-slate-800 shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mr-2 hover:bg-emerald-50 dark:hover:bg-slate-900 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-110 transition-all duration-200 hover:shadow-md relative"
        >
          {/* Custom Animated Hamburger Menu */}
          <div className="w-5 h-5 flex flex-col justify-center items-center gap-1">
            <div className={cn(
              "w-5 h-0.5 bg-gray-700 dark:bg-slate-400 rounded-full transition-all duration-300 origin-center",
              isCollapsed && "rotate-45 translate-y-1.5"
            )} />
            <div className={cn(
              "w-5 h-0.5 bg-gray-700 dark:bg-slate-400 rounded-full transition-all duration-300",
              isCollapsed && "opacity-0 scale-0"
            )} />
            <div className={cn(
              "w-5 h-0.5 bg-gray-700 dark:bg-slate-400 rounded-full transition-all duration-300 origin-center",
              isCollapsed && "-rotate-45 -translate-y-1.5"
            )} />
          </div>
        </Button>
      </div>
      <div className="flex items-center space-x-4">
        {/* Notifikasi Lonceng dengan Indikator dan Dropdown */}
        <DropdownMenu onOpenChange={(open) => {
          if (open) { // When the dropdown is opened
            markAllAsRead();
          }
        }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-gray-700 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-900 hover:text-emerald-600 dark:hover:text-emerald-400 hover:scale-110 transition-all duration-200 hover:shadow-md">
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-2 md:w-[400px]" align="end"> {/* Adjusted width for larger screens */}
            <div className="font-semibold text-sm px-2 py-1">Notifikasi Anda ({unreadCount} belum dibaca)</div>
            <DropdownMenuSeparator />
            {/* Kontainer notifikasi dengan tinggi maksimum dan scrollbar */}
            <div className="max-h-[400px] overflow-y-auto overflow-x-hidden"> {/* Added overflow-x-hidden */}
              {notifications.length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground text-sm text-center py-4" disabled>
                  Tidak ada notifikasi.
                </DropdownMenuItem>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start space-y-1 py-2 px-3 rounded-md cursor-pointer transition-colors ${!notification.is_read ? 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' : 'hover:bg-gray-100 dark:hover:bg-slate-900'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Teks notifikasi dengan word-break */}
                    <p className={cn(
                      `text-sm break-words whitespace-normal`, // Added whitespace-normal and break-words
                      !notification.is_read ? 'font-medium text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'
                    )}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true, locale: localeId })}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuItem className="text-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 cursor-pointer" disabled>
              Tandai semua sudah dibaca
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle /> {/* <-- ThemeToggle ditambahkan di sini */}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:scale-110 hover:shadow-lg transition-all duration-200">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.nama_lengkap || user.email || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-emerald-400 text-white font-semibold">
                    {getInitials(profile?.nama_lengkap || user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{profile?.nama_lengkap || 'Pengguna'}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start space-y-1" disabled>
                <p className="text-xs text-muted-foreground">Nama Lengkap</p>
                <p className="text-sm font-medium">{profile?.nama_lengkap || '-'}</p>
              </DropdownMenuItem>
              {profile?.peran === 'SKPD' ? (
                <DropdownMenuItem className="flex flex-col items-start space-y-1" disabled>
                  <p className="text-xs text-muted-foreground">Asal SKPD</p>
                  <p className="text-sm font-medium">{profile?.asal_skpd || '-'}</p>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="flex flex-col items-start space-y-1" disabled>
                  <p className="text-xs text-muted-foreground">Peran</p>
                  <p className="text-sm font-medium">
                    {profile?.peran === 'Staf Koreksi' ? 'Kuasa BUD' : (profile?.peran || '-')}
                  </p>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {!user && (
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-700 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <LogOutIcon className="h-5 w-5" />
          </Button>
        )}
      </div>

      <TagihanDetailDialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        tagihan={selectedTagihanForDetail}
      />
    </header>
  );
};

export default Header;