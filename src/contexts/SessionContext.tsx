import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setLoading(true);

      if (currentSession) {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nama_lengkap, asal_skpd, peran, avatar_url')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          toast.error('Gagal memuat profil pengguna.');
          setProfile(null);
          setRole(null);
        } else if (profileData) {
          setProfile(profileData as Profile);
          setRole(profileData.peran);
        }
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user || null);
      setLoading(true);
      if (initialSession) {
        supabase
          .from('profiles')
          .select('nama_lengkap, asal_skpd, peran, avatar_url')
          .eq('id', initialSession.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (profileError) {
              console.error('Error fetching initial profile:', profileError);
              toast.error('Gagal memuat profil pengguna awal.');
              setProfile(null);
              setRole(null);
            } else if (profileData) {
              setProfile(profileData as Profile);
              setRole(profileData.peran);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!session && location.pathname !== '/login') {
        navigate('/login');
        toast.info('Anda harus login untuk mengakses halaman ini.');
      } else if (session && location.pathname === '/login') {
        // Redirect authenticated users from login page based on role
        if (role) {
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
              navigate('/'); // Fallback for unknown roles
              break;
          }
        } else {
          navigate('/'); // Fallback if role is not yet loaded
        }
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