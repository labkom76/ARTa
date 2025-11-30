import { useSession } from "@/contexts/SessionContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { session, role, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session && role) {
      // Add delay to show loader animation
      const timer = setTimeout(() => {
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
          case 'Administrator':
            navigate('/dashboard-admin');
            break;
          default:
            // Fallback for unknown roles
            break;
        }
      }, 1500); // 1.5 second delay

      return () => clearTimeout(timer);
    }
  }, [loading, session, role, navigate]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
        <div className="text-center space-y-8">
          {/* Custom Loader with Emerald Theme */}
          <div className="flex justify-center">
            <div className="loader"></div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent animate-pulse">
              Memuat...
            </h1>
            <p className="text-lg text-emerald-700 dark:text-emerald-300">
              Mengarahkan Anda ke halaman yang sesuai.
            </p>
          </div>
        </div>

        {/* Loader Styles */}
        <style>{`
          .loader {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            position: relative;
            animation: rotate 1s linear infinite;
          }
          .loader::before, .loader::after {
            content: "";
            box-sizing: border-box;
            position: absolute;
            inset: 0px;
            border-radius: 50%;
            border: 5px solid #10b981;
            animation: prixClipFix 2s linear infinite;
          }
          .loader::after {
            border-color: #14b8a6;
            animation: prixClipFix 2s linear infinite, rotate 0.5s linear infinite reverse;
            inset: 8px;
          }

          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes prixClipFix {
            0% { clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0); }
            25% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0); }
            50% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%); }
            75% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 100%); }
            100% { clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 0 100%, 0 0); }
          }
        `}</style>
      </div>
    );
  }

  // Fallback welcome page with emerald theme
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      <div className="text-center space-y-6 p-8 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-2xl border border-emerald-200 dark:border-emerald-800">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
            Selamat Datang
          </h1>
          <p className="text-xl text-emerald-700 dark:text-emerald-300">
            Aplikasi Anda siap digunakan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;