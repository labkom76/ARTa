import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { MadeWithDyad } from './made-with-dyad';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'; // Import SheetHeader, SheetTitle, SheetDescription

const MainLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleMobileLinkClick = () => {
    setIsMobileSidebarOpen(false);
  };

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
          "flex flex-col flex-1 transition-all duration-300 relative",
          isMobile ? "ml-0" : (isSidebarCollapsed ? "ml-16" : "ml-64")
        )}
      >
        {/* Fixed Header */}
        <div className="fixed top-0 right-0 z-50" style={{
          left: isMobile ? '0' : (isSidebarCollapsed ? '4rem' : '16rem')
        }}>
          <Header toggleSidebar={isMobile ? () => setIsMobileSidebarOpen(true) : toggleSidebar} />
        </div>
        
        {/* Content with padding top */}
        <main className="flex-1 p-4 bg-gray-100 dark:bg-gray-950 pt-20">
          <div className="container mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default MainLayout;