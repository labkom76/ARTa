import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface Profile {
  id: string;
  nama_lengkap: string;
  asal_skpd: string; // This is the name of the SKPD
  peran: string;
  avatar_url?: string;
  is_active: boolean;
  // The nested structure for master_skpd data
  master_skpd?: { kode_skpd_penagihan: string | null } | null;
}

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Daftar rute publik yang tidak memerlukan autentikasi
const publicRoutes = [
  '/login',
  '/verifikasi-dokumen/',
  '/print-verifikasi',
  '/print-koreksi',
];

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs untuk mencegah duplicate operations
  const isFetchingProfile = useRef(false);
  const hasInitialized = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const navigationPending = useRef(false);

  const fetchProfile = async (userId: string, currentPath: string): Promise<boolean> => {
    // Skip jika sudah fetch untuk user yang sama
    if (isFetchingProfile.current || lastFetchedUserId.current === userId) {
      return true;
    }
    
    isFetchingProfile.current = true;
    
    try {
      // Step 1: Fetch the user's profile data
      const { data: profileDataRaw, error: profileError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, asal_skpd, peran, avatar_url, is_active') // Select direct columns from profiles
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile (step 1):', profileError.message);
        lastFetchedUserId.current = userId;
        if (!hasInitialized.current) {
          toast.error('Gagal memuat profil pengguna.');
        }
        setProfile(null);
        setRole(null);
        return false;
      }

      let finalProfile: Profile = profileDataRaw as Profile;

      // Step 2: If asal_skpd exists, fetch kode_skpd_penagihan from master_skpd
      if (profileDataRaw.asal_skpd) {
        const { data: skpdData, error: skpdError } = await supabase
          .from('master_skpd')
          .select('kode_skpd_penagihan')
          .eq('nama_skpd', profileDataRaw.asal_skpd) // Join condition: profiles.asal_skpd = master_skpd.nama_skpd
          .single();

        if (skpdError && skpdError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
          console.warn('Error fetching kode_skpd_penagihan for SKPD:', skpdError.message);
          // Don't block, just log and proceed without kode_skpd_penagihan
        } else if (skpdData) {
          finalProfile = { ...finalProfile, master_skpd: { kode_skpd_penagihan: skpdData.kode_skpd_penagihan } };
        }
      }

      // Check if profile is incomplete (nama_lengkap is null/empty)
      if (!finalProfile.nama_lengkap && currentPath !== '/lengkapi-profil') {
        setProfile(finalProfile);
        setRole(finalProfile.peran);
        lastFetchedUserId.current = userId;
        navigate('/lengkapi-profil', { replace: true });
        toast.info('Harap lengkapi profil Anda untuk melanjutkan.');
        return true;
      } else {
        setProfile(finalProfile);
        setRole(finalProfile.peran);
        lastFetchedUserId.current = userId;
        return true;
      }
    } catch (error: any) {
      console.error('Unhandled error in fetchProfile:', error.message);
      lastFetchedUserId.current = userId;
      setProfile(null);
      setRole(null);
      return false;
    } finally {
      isFetchingProfile.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeSession = async () => {
      try {
        // Safety timeout
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            setLoading(false);
            hasInitialized.current = true;
            toast.error('Waktu habis saat memuat data. Silakan refresh halaman.');
          }
        }, 5000);
        
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          const profileLoaded = await fetchProfile(initialSession.user.id, location.pathname);
          
          if (!profileLoaded) {
            toast.error('Gagal memuat profil. Silakan login ulang.');
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
        }
        
        clearTimeout(timeoutId);
        
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
          toast.error('Error saat inisialisasi. Silakan refresh halaman.');
        }
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      // Abaikan event jika belum diinisialisasi (kecuali SIGNED_OUT)
      if (!hasInitialized.current && event !== 'SIGNED_OUT') {
        return;
      }

      // Abaikan TOKEN_REFRESHED
      if (event === 'TOKEN_REFRESHED' && hasInitialized.current) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        return;
      }

      // Abaikan INITIAL_SESSION
      if (event === 'INITIAL_SESSION') {
        return;
      }

      // Tangani SIGNED_IN
      if (event === 'SIGNED_IN') {
        setLoading(true);
        navigationPending.current = false;
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          const profileLoaded = await fetchProfile(currentSession.user.id, location.pathname);
          
          if (!profileLoaded) {
            toast.error('Gagal memuat profil. Silakan coba lagi.');
          }
        }
        
        setLoading(false);
      } 
      // Tangani SIGNED_OUT
      else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        lastFetchedUserId.current = null;
        navigationPending.current = false;
      } 
      // Tangani USER_UPDATED
      else if (event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Reset navigationPending saat location berubah
  useEffect(() => {
    if (hasInitialized.current && !loading) {
      navigationPending.current = false;
    }
  }, [location.pathname, loading]);

  // PERBAIKAN UTAMA: Navigasi setelah login
  useEffect(() => {
    // Jangan menavigasi jika masih loading atau belum diinisialisasi
    if (loading || !hasInitialized.current) {
      return;
    }

    // Jangan menavigasi jika sudah ada navigasi pending
    if (navigationPending.current) {
      return;
    }

    const isCurrentRoutePublic = publicRoutes.some(route => location.pathname.startsWith(route));

    // Redirect ke login jika tidak ada sesi dan bukan di halaman publik
    if (!session && !isCurrentRoutePublic) {
      navigationPending.current = true;
      navigate('/login', { replace: true });
      toast.info('Anda harus login untuk mengakses halaman ini.');
      return;
    }

    // PERBAIKAN: Redirect dari halaman login atau root jika sudah login
    if (session && profile && role && (location.pathname === '/login' || location.pathname === '/')) { // MODIFIED: Check for profile existence
      navigationPending.current = true;

      // NEW: Check if user is active
      if (!profile.is_active) {
        toast.error('Akun Anda telah diblokir. Silakan hubungi administrator.');
        // Force logout if account is inactive and trying to access dashboard
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login', { replace: true });
        }, 0);
        return;
      }

      let targetPath = '/';
      switch (role) {
        case 'SKPD':
          targetPath = '/dashboard-skpd';
          break;
        case 'Staf Registrasi':
          targetPath = '/dashboard-registrasi';
          break;
        case 'Staf Verifikator':
          targetPath = '/dashboard-verifikasi';
          break;
        case 'Staf Koreksi':
          targetPath = '/dashboard-koreksi';
          break;
        case 'Administrator':
          targetPath = '/admin/dashboard';
          break;
        default:
          toast.warning('Profil tidak ditemukan. Silakan hubungi administrator.');
          return;
      }

      // PENTING: Gunakan setTimeout untuk memastikan navigasi terjadi setelah render
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 0);
      
      return;
    }
  }, [session, loading, role, navigate, location.pathname, profile]);

  return (
    <SessionContext.Provider value={{ session, user, profile, role, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};