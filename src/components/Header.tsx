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
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface HeaderProps {
  toggleSidebar: () => void;
}

interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { profile, user } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
      // toast.error('Gagal memuat notifikasi.'); // Avoid spamming toast on every error
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup real-time subscription for notifications
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`, // Only listen for current user's notifications
        },
        (payload) => {
          console.log('Realtime notification change:', payload);
          fetchNotifications(); // Re-fetch all notifications on any change
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]); // Re-run effect if user changes

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
      console.log('All unread notifications marked as read.');
      // The real-time subscription will trigger fetchNotifications and update UI
    } catch (error: any) {
      console.error('Error marking notifications as read:', error.message);
      toast.error('Gagal menandai notifikasi sudah dibaca: ' + error.message);
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
    <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2">
          <MenuIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
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
            <Button variant="ghost" size="icon" className="relative text-gray-600 dark:text-gray-300">
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-2" align="end">
            <div className="font-semibold text-sm px-2 py-1">Notifikasi Anda ({unreadCount} belum dibaca)</div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem className="text-muted-foreground text-sm text-center py-4" disabled>
                Tidak ada notifikasi.
              </DropdownMenuItem>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start space-y-1 py-2 px-3 rounded-md cursor-default ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <p className={`text-sm ${!notification.is_read ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true, locale: localeId })}
                  </p>
                </DropdownMenuItem>
              ))
            )}
            {notifications.length > 0 && (
              <DropdownMenuSeparator />
            )}
            {/* Tombol "Tandai semua sudah dibaca" (sekarang dinonaktifkan karena otomatis) */}
            <DropdownMenuItem className="text-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer" disabled>
              Tandai semua sudah dibaca
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {user && (
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.nama_lengkap || user.email || "User"} />
              <AvatarFallback className="bg-blue-500 text-white">
                {getInitials(profile?.nama_lengkap || user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-sm text-gray-700 dark:text-gray-200">
              <p className="font-medium">{profile?.nama_lengkap || user.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{profile?.peran || 'Pengguna'}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400">
          <LogOutIcon className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Header;