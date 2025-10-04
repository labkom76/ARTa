import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface Profile {
  id: string;
  nama_lengkap: string;
  asal_skpd: string;
  peran: string;
  avatar_url?: string;
}

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

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
  const hasNavigated = useRef(false);

  const fetchProfile = async (userId: string): Promise<boolean> => {
    // Skip jika sudah fetch untuk user yang sama
    if (isFetchingProfile.current || lastFetchedUserId.current === userId) {
      console.log('Skipping duplicate fetch for user:', userId);
      return true;
    }
    
    isFetchingProfile.current = true;
    
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nama_lengkap, asal_skpd, peran, avatar_url')
        .eq('id', userId)
        .single();

      console.log('Profile fetch result:', { profileData, profileError });

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        lastFetchedUserId.current = userId;
        
        if (!hasInitialized.current) {
          toast.error('Gagal memuat profil pengguna.');
        }
        setProfile(null);
        setRole(null);
        return false;
      } else if (profileData) {
        setProfile(profileData as Profile);
        setRole(profileData.peran);
        lastFetchedUserId.current = userId;
        console.log('✅ Profile loaded:', profileData.peran);
        return true;
      } else {
        console.warn('Profile data is null without error - likely RLS policy issue');
        lastFetchedUserId.current = userId;
        setProfile(null);
        setRole(null);
        return false;
      }
    } catch (error) {
      console.error('Profile fetch exception:', error);
      lastFetchedUserId.current = userId;
      setProfile(null);
      setRole(null);
      return false;
    } finally {
      isFetchingProfile.current = false;
      console.log('Profile fetch completed');
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeSession = async () => {
      try {
        console.log('🔄 Starting session initialization...');
        
        // Safety timeout - force loading false after 5 seconds
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn('⚠️ TIMEOUT: Forcing loading to false after 5s');
            setLoading(false);
            hasInitialized.current = true;
            toast.error('Timeout loading data. Silakan refresh halaman.');
          }
        }, 5000);
        
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }
        
        if (!mounted) return;

        console.log('📦 Initial session:', initialSession ? 'exists' : 'null');

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // 🔥 CRITICAL: Tunggu profile selesai sebelum set loading false
          const profileLoaded = await fetchProfile(initialSession.user.id);
          
          if (!profileLoaded) {
            console.error('❌ Profile failed to load');
            toast.error('Gagal memuat profil. Silakan login ulang.');
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
        }
        
        // Clear timeout jika berhasil
        clearTimeout(timeoutId);
        
        // Set loading false HANYA setelah semua data siap
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
          console.log('✅ Session initialization completed, loading=false');
        }
      } catch (error) {
        console.error('❌ Session initialization error:', error);
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
          toast.error('Error saat inisialisasi. Silakan refresh halaman.');
        }
      }
    };

    initializeSession();

    // 🔥 FIX: Subscribe to auth changes - ini yang tadinya salah posisi!
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log('🔔 Auth event:', event, 'hasInitialized:', hasInitialized.current);

      // 🔥 CRITICAL: Ignore ALL events jika belum initialized
      // Ini mencegah race condition saat page load
      if (!hasInitialized.current && event !== 'SIGNED_OUT') {
        console.log('⏭️ Skipping event - not initialized yet');
        return;
      }

      // Ignore TOKEN_REFRESHED setelah initialized
      if (event === 'TOKEN_REFRESHED' && hasInitialized.current) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        console.log('♻️ Token refreshed, skipping profile refetch');
        return;
      }

      // Ignore INITIAL_SESSION - sudah di-handle di initializeSession
      if (event === 'INITIAL_SESSION') {
        console.log('⏭️ Skipping INITIAL_SESSION - already handled');
        return;
      }

      // Handle SIGNED_IN
      if (event === 'SIGNED_IN') {
        console.log('🔐 User signed in - starting profile fetch');
        setLoading(true);
        hasNavigated.current = false; // Reset navigation flag
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          const profileLoaded = await fetchProfile(currentSession.user.id);
          
          if (profileLoaded) {
            console.log('✅ Login successful, profile loaded');
          } else {
            console.error('❌ Login successful but profile failed to load');
            toast.error('Gagal memuat profil. Silakan coba lagi.');
          }
        }
        
        setLoading(false);
        console.log('✅ SIGNED_IN handling completed');
      } 
      // Handle SIGNED_OUT
      else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out');
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        lastFetchedUserId.current = null;
        hasNavigated.current = false;
      } 
      // Handle USER_UPDATED
      else if (event === 'USER_UPDATED') {
        console.log('👤 User updated');
        setSession(currentSession);
        setUser(currentSession?.user || null);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // 🔥 FIXED: Navigation effect dengan proper guards
  useEffect(() => {
    // Jangan navigate jika masih loading atau belum initialized
    if (loading || !hasInitialized.current) {
      console.log('⏳ Skipping navigation - loading or not initialized');
      return;
    }

    // Jangan navigate jika sudah pernah navigate di session ini
    if (hasNavigated.current) {
      console.log('🚫 Skipping navigation - already navigated');
      return;
    }

    const isLoginPage = location.pathname === '/login';
    const currentPath = location.pathname;
    
    console.log('🧭 Navigation check:', { 
      hasSession: !!session, 
      isLoginPage, 
      role,
      currentPath 
    });

    // Redirect ke login jika tidak ada session dan bukan di login page
    if (!session && !isLoginPage) {
      console.log('➡️ Redirecting to login');
      hasNavigated.current = true;
      navigate('/login', { replace: true });
      toast.info('Anda harus login untuk mengakses halaman ini.');
      return;
    }

    // Redirect dari login page jika sudah login
    if (session && isLoginPage) {
      if (!role) {
        console.warn('⚠️ Session exists but role is null, waiting...');
        return;
      }

      console.log('➡️ Redirecting from login to dashboard');
      hasNavigated.current = true;

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
          console.warn('⚠️ Unknown role:', role);
          toast.warning('Profil tidak ditemukan. Silakan hubungi administrator.');
          break;
      }

      navigate(targetPath, { replace: true });
      return;
    }

    // 🆕 Jika sudah di path yang benar, mark as navigated
    // Ini mencegah infinite check loop
    if (session && role && !isLoginPage) {
      const validPaths = [
        '/dashboard-skpd',
        '/portal-skpd',
        '/dashboard-registrasi',
        '/portal-registrasi',
        '/riwayat-registrasi',
        '/dashboard-verifikasi',
        '/portal-verifikasi',
        '/riwayat-verifikasi',
        '/dashboard-koreksi',
        '/rekap-dikembalikan',
        '/admin/users',
        '/admin/dashboard',
        '/'
      ];

      if (validPaths.includes(currentPath)) {
        console.log('✅ Already at valid path, marking as navigated');
        hasNavigated.current = true;
      }
    }
  }, [session, loading, role, navigate, location.pathname]);

  // Reset hasNavigated saat location berubah (user manually navigate)
  useEffect(() => {
    if (hasInitialized.current && !loading) {
      hasNavigated.current = false;
    }
  }, [location.pathname, loading]);

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