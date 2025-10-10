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

  const fetchProfile = async (userId: string, currentPath: string): Promise<boolean> => {
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
        // MODIFIKASI: Tambahkan logika untuk memeriksa nama_lengkap
        if (!profileData.nama_lengkap && currentPath !== '/lengkapi-profil') {
          setProfile(profileData as Profile); // Tetap set profil, meskipun belum lengkap
          setRole(profileData.peran); // Tetap set peran
          lastFetchedUserId.current = userId;
          console.log('⚠️ Profil belum lengkap, mengarahkan ke /lengkapi-profil');
          navigate('/lengkapi-profil', { replace: true });
          toast.info('Harap lengkapi profil Anda untuk melanjutkan.');
          return true; // Data profil ditemukan, meskipun belum lengkap
        } else {
          setProfile(profileData as Profile);
          setRole(profileData.peran);
          lastFetchedUserId.current = userId;
          console.log('✅ Profil dimuat:', profileData.peran);
          return true;
        }
      } else {
        console.warn('Data profil null tanpa error - kemungkinan masalah kebijakan RLS');
        lastFetchedUserId.current = userId;
        setProfile(null);
        setRole(null);
        return false;
      }
    } catch (error) {
      console.error('Pengecualian saat mengambil profil:', error);
      lastFetchedUserId.current = userId;
      setProfile(null);
      setRole(null);
      return false;
    } finally {
      isFetchingProfile.current = false;
      console.log('Pengambilan profil selesai');
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeSession = async () => {
      try {
        console.log('🔄 Memulai inisialisasi sesi...');
        
        // Safety timeout - paksa loading false setelah 5 detik
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn('⚠️ TIMEOUT: Memaksa loading menjadi false setelah 5 detik');
            setLoading(false);
            hasInitialized.current = true;
            toast.error('Waktu habis saat memuat data. Silakan refresh halaman.');
          }
        }, 5000);
        
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error sesi:', sessionError);
          throw sessionError;
        }
        
        if (!mounted) return;

        console.log('📦 Sesi awal:', initialSession ? 'ada' : 'null');

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // MODIFIKASI: Teruskan navigate dan location.pathname ke fetchProfile
          const profileLoaded = await fetchProfile(initialSession.user.id, location.pathname);
          
          if (!profileLoaded) {
            console.error('❌ Profil gagal dimuat');
            toast.error('Gagal memuat profil. Silakan login ulang.');
          }
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRole(null);
        }
        
        // Hapus timeout jika berhasil
        clearTimeout(timeoutId);
        
        // Set loading false HANYA setelah semua data siap
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
          console.log('✅ Inisialisasi sesi selesai, loading=false');
        }
      } catch (error) {
        console.error('❌ Error inisialisasi sesi:', error);
        clearTimeout(timeoutId);
        if (mounted) {
          setLoading(false);
          hasInitialized.current = true;
          toast.error('Error saat inisialisasi. Silakan refresh halaman.');
        }
      }
    };

    initializeSession();

    // 🔥 FIX: Subscribe ke perubahan otentikasi
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      console.log('🔔 Event otentikasi:', event, 'hasInitialized:', hasInitialized.current);

      // 🔥 KRITIS: Abaikan SEMUA event jika belum diinisialisasi
      // Ini mencegah kondisi balapan saat pemuatan halaman
      if (!hasInitialized.current && event !== 'SIGNED_OUT') {
        console.log('⏭️ Melewati event - belum diinisialisasi');
        return;
      }

      // Abaikan TOKEN_REFRESHED setelah diinisialisasi
      if (event === 'TOKEN_REFRESHED' && hasInitialized.current) {
        setSession(currentSession);
        setUser(currentSession?.user || null);
        console.log('♻️ Token diperbarui, melewati pengambilan ulang profil');
        return;
      }

      // Abaikan INITIAL_SESSION - sudah ditangani di initializeSession
      if (event === 'INITIAL_SESSION') {
        console.log('⏭️ Melewati INITIAL_SESSION - sudah ditangani');
        return;
      }

      // Tangani SIGNED_IN
      if (event === 'SIGNED_IN') {
        console.log('🔐 Pengguna masuk - memulai pengambilan profil');
        setLoading(true);
        hasNavigated.current = false; // Reset flag navigasi
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          // MODIFIKASI: Teruskan navigate dan location.pathname ke fetchProfile
          const profileLoaded = await fetchProfile(currentSession.user.id, location.pathname);
          
          if (profileLoaded) {
            console.log('✅ Login berhasil, profil dimuat');
          } else {
            console.error('❌ Login berhasil tetapi profil gagal dimuat');
            toast.error('Gagal memuat profil. Silakan coba lagi.');
          }
        }
        
        setLoading(false);
        console.log('✅ Penanganan SIGNED_IN selesai');
      } 
      // Tangani SIGNED_OUT
      else if (event === 'SIGNED_OUT') {
        console.log('🚪 Pengguna keluar');
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        lastFetchedUserId.current = null;
        hasNavigated.current = false;
      } 
      // Tangani USER_UPDATED
      else if (event === 'USER_UPDATED') {
        console.log('👤 Pengguna diperbarui');
        setSession(currentSession);
        setUser(currentSession?.user || null);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]); // Tambahkan navigate dan location.pathname ke dependensi

  // Reset hasNavigated saat location berubah (pengguna menavigasi secara manual)
  useEffect(() => {
    if (hasInitialized.current && !loading) {
      hasNavigated.current = false;
    }
  }, [location.pathname, loading]);

  useEffect(() => {
    // Jangan menavigasi jika masih memuat atau belum diinisialisasi
    if (loading || !hasInitialized.current) {
      console.log('⏳ Melewati navigasi - memuat atau belum diinisialisasi');
      return;
    }

    // Jangan menavigasi jika sudah pernah menavigasi di sesi ini
    if (hasNavigated.current) {
      console.log('🚫 Melewati navigasi - sudah dinavigasi');
      return;
    }

    const isLoginPage = location.pathname === '/login';
    const currentPath = location.pathname;
    
    console.log('🧭 Pemeriksaan navigasi:', { 
      hasSession: !!session, 
      isLoginPage, 
      role,
      currentPath 
    });

    // Arahkan ke login jika tidak ada sesi dan bukan di halaman login
    if (!session && !isLoginPage) {
      console.log('➡️ Mengarahkan ke login');
      hasNavigated.current = true;
      navigate('/login', { replace: true });
      toast.info('Anda harus login untuk mengakses halaman ini.');
      return;
    }

    // Arahkan dari halaman login jika sudah login
    if (session && isLoginPage) {
      if (!role) {
        console.warn('⚠️ Sesi ada tetapi peran null, menunggu...');
        return;
      }

      console.log('➡️ Mengarahkan dari login ke dashboard');
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
          console.warn('⚠️ Peran tidak dikenal:', role);
          toast.warning('Profil tidak ditemukan. Silakan hubungi administrator.');
          break;
      }

      navigate(targetPath, { replace: true });
      return;
    }

    // 🆕 Jika sudah di jalur yang benar, tandai sebagai sudah dinavigasi
    // Ini mencegah loop pemeriksaan tak terbatas
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
        '/admin/tagihan',
        '/admin/custom-login',
        '/lengkapi-profil', // MODIFIKASI: Tambahkan halaman lengkapi profil ke jalur yang valid
        '/'
      ];

      if (validPaths.includes(currentPath)) {
        console.log('✅ Sudah di jalur yang valid, menandai sebagai sudah dinavigasi');
        hasNavigated.current = true;
      }
    }
  }, [session, loading, role, navigate, location.pathname, profile]); // Tambahkan profil ke dependensi

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