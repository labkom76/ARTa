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

      {/* Announcement Modal - Emerald Green Theme */}
      <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh] border-emerald-200 dark:border-emerald-800 shadow-2xl">
          <DialogHeader className="border-b border-emerald-100 dark:border-emerald-900/50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                Papan Informasi
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Scrollable content area with custom scrollbar */}
          <div className="flex-1 overflow-y-auto px-1 py-4 scrollbar-thin scrollbar-thumb-emerald-300 dark:scrollbar-thumb-emerald-700 scrollbar-track-transparent">
            <DialogDescription className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-emerald-900 dark:prose-headings:text-emerald-100 prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-strong:text-emerald-700 dark:prose-strong:text-emerald-300">
              <ReactMarkdown>{announcementContent}</ReactMarkdown>
            </DialogDescription>
          </div>

          <DialogFooter className="border-t border-emerald-100 dark:border-emerald-900/50 pt-4">
            <Button
              onClick={() => setIsAnnouncementOpen(false)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MainLayout;