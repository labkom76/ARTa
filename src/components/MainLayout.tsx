import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { MadeWithDyad } from './made-with-dyad';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // Import SheetHeader, SheetTitle, SheetDescription
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'; // Import Dialog components
import { Button } from '@/components/ui/button'; // Import Button
import { supabase } from '@/integrations/supabase/client'; // Import supabase
import { useSession } from '@/contexts/SessionContext'; // Import useSession
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown

const MainLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const { profile, loading: sessionLoading } = useSession(); // Get profile and loading from session

  // State for announcement modal
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementVisibility, setAnnouncementVisibility] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleMobileLinkClick = () => {
    setIsMobileSidebarOpen(false);
  };

  // Effect to fetch announcement settings
  useEffect(() => {
    const fetchAnnouncementSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['announcement_visibility', 'announcement_content']);

        if (error) throw error;

        const settingsMap = new Map(data.map(item => [item.key, item.value]));
        setAnnouncementVisibility(settingsMap.get('announcement_visibility') === 'true');
        setAnnouncementContent(settingsMap.get('announcement_content') || '');
      } catch (error) {
        console.error('Error fetching announcement settings:', error);
      }
    };

    fetchAnnouncementSettings();
  }, []);

  // Effect to display announcement modal based on conditions
  useEffect(() => {
    if (!sessionLoading && profile && announcementVisibility) {
      // Check if user is not an Administrator AND announcement hasn't been shown in this session
      if (profile.peran !== 'Administrator' && !sessionStorage.getItem('announcementShown')) {
        setIsAnnouncementOpen(true);
        sessionStorage.setItem('announcementShown', 'true'); // Mark as shown for this session
      }
    }
  }, [sessionLoading, profile, announcementVisibility]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {isMobile ? (
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetTrigger asChild>
            {/* This trigger is handled by the MenuIcon in the Header component */}
            <span className="sr-only">Open sidebar</span>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            {/* Added SheetHeader with Title and Description for accessibility */}
            <SheetHeader className="sr-only"> {/* sr-only to hide visually but keep for screen readers */}
              <SheetTitle>Menu Navigasi</SheetTitle>
              <SheetDescription>Pilih halaman yang ingin Anda kunjungi.</SheetDescription>
            </SheetHeader>
            <Sidebar isCollapsed={false} onLinkClick={handleMobileLinkClick} />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar isCollapsed={isSidebarCollapsed} />
      )}

      <div
        className={cn(
          "flex flex-col flex-1 transition-all duration-500 ease-in-out relative",
          isMobile ? "ml-0" : (isSidebarCollapsed ? "ml-16" : "ml-64")
        )}
      >
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 z-50" style={{
          left: isMobile ? '0' : (isSidebarCollapsed ? '4rem' : '16rem')
        }}>
          <Header toggleSidebar={isMobile ? () => setIsMobileSidebarOpen(true) : toggleSidebar} isCollapsed={isSidebarCollapsed} />
        </div>

        {/* Content with padding top */}
        <main className="flex-1 p-4 bg-gray-100 dark:bg-gray-950 pt-20">
          <div className="container mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <MadeWithDyad />
      </div>

      {/* Announcement Modal */}
      <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
        <DialogContent className="sm:max-w-[425px] flex flex-col max-h-[90vh]"> {/* Added flex-col and max-h */}
          <DialogHeader>
            <DialogTitle>Papan Informasi</DialogTitle>
          </DialogHeader>
          {/* Scrollable content area, taking remaining space */}
          <div className="flex-1 overflow-y-auto px-6 py-2"> {/* px-6 to match DialogContent's horizontal padding, py-2 for vertical spacing */}
            <DialogDescription className="prose dark:prose-invert">
              <ReactMarkdown>{announcementContent}</ReactMarkdown>
            </DialogDescription>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAnnouncementOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout;