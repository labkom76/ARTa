import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes"; // Import ThemeProvider
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
import AdminUsers from "./pages/AdminUsers";
import AdminDashboard from "./pages/AdminDashboard";
import AdminTagihan from "./pages/AdminTagihan";
import AdminCustomLogin from "./pages/AdminCustomLogin";
import LengkapiProfil from "./pages/LengkapiProfil";
import AdminKodeSKPD from "./pages/AdminKodeSKPD";
import AdminJadwalPenganggaran from "./pages/AdminJadwalPenganggaran";
import AdminNomorPerben from "./pages/AdminNomorPerben";
import VerifikasiDokumen from "./pages/VerifikasiDokumen"; // Import the new VerifikasiDokumen page
import AdminLaporan from "./pages/AdminLaporan"; // Import the new AdminLaporan page
import AdminActivityLog from "./pages/AdminActivityLog"; // Import the new AdminActivityLog page
import AdminSumberDana from "./pages/AdminSumberDana"; // Import the new AdminSumberDana page
import RiwayatTagihan from "./pages/RiwayatTagihan"; // Import the new History page
import PortalSP2D from "./pages/PortalSP2D"; // Import the new PortalSP2D page
import PortalRegistrasiSP2D from "./pages/PortalRegistrasiSP2D"; // Import the new PortalRegistrasiSP2D page
import PrintRegistrasiSP2D from "./pages/PrintRegistrasiSP2D"; // Import the new PrintRegistrasiSP2D page
import DashboardSP2D from "./pages/DashboardSP2D"; // Import the new DashboardSP2D page
import { SessionContextProvider } from "./contexts/SessionContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem> {/* ThemeProvider added here */}
          <SessionContextProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/print-verifikasi" element={<PrintVerifikasi />} />
              <Route path="/print-koreksi" element={<PrintKoreksi />} />
              <Route path="/print-registrasi-sp2d" element={<PrintRegistrasiSP2D />} />
              <Route path="/lengkapi-profil" element={<LengkapiProfil />} />
              <Route path="/verifikasi-dokumen/:tagihanId" element={<VerifikasiDokumen />} /> {/* New public route */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/dashboard-skpd" element={<DashboardSKPD />} />
                <Route path="/portal-skpd" element={<PortalSKPD />} />
                <Route path="/riwayat-tagihan" element={<RiwayatTagihan />} />
                <Route path="/dashboard-registrasi" element={<DashboardRegistrasi />} />
                <Route path="/portal-registrasi" element={<PortalRegistrasi />} />
                <Route path="/riwayat-registrasi" element={<RiwayatRegistrasi />} />
                <Route path="/dashboard-verifikasi" element={<DashboardVerifikasi />} />
                <Route path="/portal-verifikasi" element={<PortalVerifikasi />} />
                <Route path="/riwayat-verifikasi" element={<RiwayatVerifikasi />} />
                <Route path="/dashboard-sp2d" element={<DashboardSP2D />} />
                <Route path="/portal-sp2d" element={<PortalSP2D />} />
                <Route path="/daftar-registrasi-sp2d" element={<PortalRegistrasiSP2D />} />

                <Route path="/dashboard-koreksi" element={<DashboardKoreksi />} />
                <Route path="/rekap-dikembalikan" element={<RekapDikembalikan />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/tagihan" element={<AdminTagihan />} />
                <Route path="/admin/custom-login" element={<AdminCustomLogin />} />
                <Route path="/admin/kode-skpd" element={<AdminKodeSKPD />} />
                <Route path="/admin/jadwal-penganggaran" element={<AdminJadwalPenganggaran />} />
                <Route path="/admin/nomor-perben" element={<AdminNomorPerben />} />
                <Route path="/admin/laporan" element={<AdminLaporan />} /> {/* New AdminLaporan route */}
                <Route path="/admin/activity-log" element={<AdminActivityLog />} /> {/* New AdminActivityLog route */}
                <Route path="/admin/sumber-dana" element={<AdminSumberDana />} /> {/* New AdminSumberDana route */}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionContextProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;