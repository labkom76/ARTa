import React from 'react';
import { Button } from '@/components/ui/button';
import { MenuIcon, LogOutIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { profile, user } = useSession();

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
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2"> {/* Removed lg:hidden */}
          <MenuIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
      <div className="flex items-center space-x-4">
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