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
import TagihanDetailDialog from './TagihanDetailDialog'; // Import TagihanDetailDialog
import { cn } from '@/lib/utils'; // Import cn for class merging
import { ThemeToggle } from "@/components/ThemeToggle"; // Import ThemeToggle

interface HeaderProps {
  toggleSidebar: () => void;
}

interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tagihan_id?: string;
}

// Define Tagihan interface for the detail dialog
interface Tagihan {
  id_tagihan: string;
  nama_skpd: string;
  nomor_spm: string;
  jenis_spm: string;
  jenis_tagihan: string;
  uraian: string;
  jumlah_kotor: number;
  status_tagihan: string;
  waktu_input: string;
  id_pengguna_input: string;
  catatan_verifikator?: string;
  nomor_registrasi?: string;
  waktu_registrasi?: string;
  nama_registrator?: string;
  waktu_verifikasi?: string;
  detail_verifikasi?: { item: string; memenuhi_syarat: boolean; keterangan: string }[];
  nomor_verifikasi?: string;
  nama_verifikator?: string;
  nomor_koreksi?: string;
  id_korektor?: string;
  waktu_koreksi?: string;
  catatan_koreksi?: string;
  sumber_dana?: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { profile, user } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // State for Tagihan Detail Dialog
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
    if (!notification.tagihan_id) {
      toast.info('Detail tagihan tidak tersedia untuk notifikasi ini.');
      return;
    }

    // Mark notification as read
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    // Fetch tagihan details
    try {
      const { data, error } = await supabase
        .from('database_tagihan')
        .select('*')
        .eq('id_tagihan', notification.tagihan_id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Tagihan tidak ditemukan.');

      setSelectedTagihanForDetail(data as Tagihan);
      setIsDetailModalOpen(true);
    } catch (error: any) {
      console.error('Error fetching tagihan details:', error.message);
      toast.error('Gagal memuat detail tagihan: ' + error.message);
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
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
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
                    className={`flex flex-col items-start space-y-1 py-2 px-3 rounded-md cursor-pointer ${!notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Teks notifikasi dengan word-break */}
                    <p className={cn(
                      `text-sm break-words whitespace-normal`, // Added whitespace-normal and break-words
                      !notification.is_read ? 'font-medium text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'
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
            <DropdownMenuItem className="text-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer" disabled>
              Tandai semua sudah dibaca
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle /> {/* <-- ThemeToggle ditambahkan di sini */}

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.nama_lengkap || user.email || "User"} />
                  <AvatarFallback className="bg-blue-500 text-white">
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
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-600 hover:text-red-500 dark:text-gray-300 dark:hover:text-red-400">
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