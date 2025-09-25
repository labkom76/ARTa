import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { session, role, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      switch (role) {
        case 'SKPD':
          navigate('/dashboard-skpd');
          break;
        case 'Staf Registrasi':
          navigate('/dashboard-registrasi');
          break;
        case 'Staf Verifikator':
          navigate('/dashboard-verifikasi');
          break;
        default:
          // Fallback for unknown roles or if no specific dashboard
          // Could show a generic welcome or redirect to a default dashboard
          break;
      }
    }
  }, [loading, session, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">Memuat...</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">Mengarahkan Anda ke halaman yang sesuai.</p>
        </div>
        <MadeWithDyad />
      </div>
    );
  }

  // If not loading and no session, SessionContext will redirect to /login
  // If loading is false, session exists, but role is not yet determined or no specific redirect,
  // we can show a generic welcome or a default dashboard.
  // For now, if role is not set or no specific dashboard, it will stay on this page.
  // The SessionContext already handles redirecting authenticated users from /login to their dashboard.
  // This Index page will primarily serve as a landing for unauthenticated users before redirect,
  // or a generic page if no specific role-based dashboard is found.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">Selamat Datang</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Aplikasi Anda siap digunakan.</p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;