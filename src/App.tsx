import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import MainLayout from "./components/MainLayout";
import DashboardSKPD from "./pages/DashboardSKPD";
import PortalSKPD from "./pages/PortalSKPD";
import DashboardRegistrasi from "./pages/DashboardRegistrasi";
import PortalRegistrasi from "./pages/PortalRegistrasi";
import RiwayatRegistrasi from "./pages/RiwayatRegistrasi";
import DashboardVerifikasi from "./pages/DashboardVerifikasi";
import PortalVerifikasi from "./pages/PortalVerifikasi";
import PrintVerifikasi from "./pages/PrintVerifikasi";
import RiwayatVerifikasi from "./pages/RiwayatVerifikasi";
import DashboardKoreksi from "./pages/DashboardKoreksi";
import RekapDikembalikan from "./pages/RekapDikembalikan";
import PrintKoreksi from "./pages/PrintKoreksi";
import AdminUsers from "./pages/AdminUsers"; // Import the new AdminUsers page
import { SessionContextProvider } from "./contexts/SessionContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/print-verifikasi" element={<PrintVerifikasi />} />
            <Route path="/print-koreksi" element={<PrintKoreksi />} />
            <Route element={<MainLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard-skpd" element={<DashboardSKPD />} />
              <Route path="/portal-skpd" element={<PortalSKPD />} />
              <Route path="/dashboard-registrasi" element={<DashboardRegistrasi />} />
              <Route path="/portal-registrasi" element={<PortalRegistrasi />} />
              <Route path="/riwayat-registrasi" element={<RiwayatRegistrasi />} />
              <Route path="/dashboard-verifikasi" element={<DashboardVerifikasi />} />
              <Route path="/portal-verifikasi" element={<PortalVerifikasi />} />
              <Route path="/riwayat-verifikasi" element={<RiwayatVerifikasi />} />
              <Route path="/dashboard-koreksi" element={<DashboardKoreksi />} />
              <Route path="/rekap-dikembalikan" element={<RekapDikembalikan />} />
              <Route path="/admin/users" element={<AdminUsers />} /> {/* New route for AdminUsers */}
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;