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

  // Refs untuk menyimpan nilai state terbaru
  const latestUser = useRef<User | null>(null);
  const latestSession = useRef<Session | null>(null);

  // Update refs setiap kali state user atau session berubah
  useEffect(() => {
    latestUser.current = user;
  }, [user]);

  useEffect(() => {
    latestSession.current = session;
  }, [session]);

  useEffect(() => {
    // Fungsi untuk memeriksa sesi awal saat komponen di-mount
    const checkInitialSession = async () => {
      setLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      setSession(initialSession);
      setUser(initialSession?.user || null);
      latestSession.current = initialSession; // Update ref
      latestUser.current = initialSession?.user || null; // Update ref

      if (initialSession) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nama_lengkap, asal_skpd, peran, avatar_url')
          .eq('id', initialSession.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching initial profile:', profileError);
          toast.error('Gagal memuat profil pengguna awal.');
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
    };

    checkInitialSession();

    // Listener untuk perubahan status autentikasi Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      // Selalu perbarui state session dan user ke yang terbaru
      setSession(currentSession);
      setUser(currentSession?.user || null);

      // Tentukan apakah pengambilan profil penuh diperlukan
      // Gunakan ref untuk mendapatkan user ID sebelumnya yang paling mutakhir
      const previousUserId = latestUser.current?.id; 
      const currentUserId = currentSession?.user?.id;

      const isActualUserChange = (event === 'SIGNED_IN' && currentUserId) ||
                                 (event === 'SIGNED_OUT' && !currentUserId) ||
                                 (event === 'USER_UPDATED' && previousUserId !== currentUserId);

      if (isActualUserChange) {
        setLoading(true); // Mulai loading untuk pengambilan profil
        if (currentSession) {
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
          // Bersihkan profil jika logout
          setProfile(null);
          setRole(null);
        }
        setLoading(false); // Akhiri loading setelah pengambilan profil
      } else if (event === 'TOKEN_REFRESHED' || (event === 'USER_UPDATED' && previousUserId === currentUserId)) {
        // Untuk penyegaran token atau pembaruan user tanpa perubahan ID,
        // kita sudah memperbarui session/user. Pastikan loading false.
        setLoading(false); 
      }
      // Untuk event lain yang tidak memerlukan tindakan khusus, tidak perlu mengubah state loading.
    });

    return () => subscription.unsubscribe();
  }, []); // Dependency array kosong agar listener hanya diatur sekali

  useEffect(() => {
    if (!loading) {
      const isLoginPage = location.pathname === '/login';

      if (!session && !isLoginPage) {
        navigate('/login');
        toast.info('Anda harus login untuk mengakses halaman ini.');
      } else if (session && isLoginPage) {
        // Redirect dari login page berdasarkan peran
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
          case 'Staf Koreksi': // New case for Staf Koreksi
            navigate('/portal-verifikasi'); // Redirect to portal-verifikasi
            break;
          default:
            navigate('/');
            break;
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