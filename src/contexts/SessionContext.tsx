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
  
  const isFetchingProfile = useRef(false);
  const hasInitialized = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    // Skip jika sudah fetch untuk user yang sama
    if (isFetchingProfile.current || lastFetchedUserId.current === userId) {
      return;
    }
    
    isFetchingProfile.current = true;
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('nama_lengkap, asal_skpd, peran, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        // Hanya show error toast saat pertama kali, bukan saat refresh
        if (!hasInitialized.current) {
          toast.error('Gagal memuat profil pengguna.');
        }
        setProfile(null);
        setRole(null);
      } else if (profileData) {
        setProfile(profileData as Profile);
        setRole(profileData.peran);
        lastFetchedUserId.current = userId;
      }
    } finally {
      isFetchingProfile.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user || null);
        
        if (initialSession) {
          await fetchProfile(initialSession.user.id);
        }
        
        setLoading(false);
        hasInitialized.current = true;
      } catch (error) {
        console.error('Session initialization error:', error);
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
        }
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log('Auth event:', event); // Debug log

      // CRITICAL: Ignore TOKEN_REFRESHED setelah initialized
      if (event === 'TOKEN_REFRESHED' && hasInitialized.current) {
        // Hanya update session, jangan fetch ulang atau set loading
        setSession(currentSession);
        setUser(currentSession?.user || null);
        return;
      }

      // Handle events yang benar-benar butuh action
      if (event === 'SIGNED_IN') {
        setLoading(true);
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession) {
          await fetchProfile(currentSession.user.id);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        lastFetchedUserId.current = null;
      } else if (event === 'USER_UPDATED') {
        setSession(currentSession);
        setUser(currentSession?.user || null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || !hasInitialized.current) return;

    const isLoginPage = location.pathname === '/login';

    if (!session && !isLoginPage) {
      navigate('/login');
      toast.info('Anda harus login untuk mengakses halaman ini.');
    } else if (session && isLoginPage && role) {
      // Redirect dari login page
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
          navigate('/');
          break;
      }
    }
  }, [session, loading, role, navigate, location.pathname]);

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