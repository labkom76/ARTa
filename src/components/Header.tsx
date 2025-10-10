import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MenuIcon, LogOutIcon, BellIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { profile, user } = useSession();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchUnreadNotifications = async () => {
    if (!user) {
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setUnreadNotificationsCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching unread notifications:', error.message);
      // toast.error('Gagal memuat notifikasi.'); // Avoid spamming toast on every error
      setUnreadNotificationsCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadNotifications();

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
          fetchUnreadNotifications(); // Re-fetch count on any change
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
        {/* Notifikasi Lonceng dengan Indikator */}
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-300">
            <BellIcon className="h-5 w-5" />
          </Button>
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
          )}
        </div>
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