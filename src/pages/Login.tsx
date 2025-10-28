import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // MailIcon masih diimpor tapi tidak digunakan untuk tombol OTP
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

const Login = () => {
  const [loginSettings, setLoginSettings] = useState({
    login_background_url: '',
    login_form_position: 'center',
    login_layout_random: 'false',
    login_background_effect: 'false',
    login_background_slider: 'false',
    login_background_blur: 'false',
    login_show_forgot_password: 'true',
    login_show_signup: 'true',
    login_show_email_password: 'true',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const [currentFormPosition, setCurrentFormPosition] = useState<string>('center');
  const [allBackgroundImages, setAllBackgroundImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSliderEnabled, setIsSliderEnabled] = useState(false);
  const [backgroundOpacity, setBackgroundOpacity] = useState(1);

  const [appName, setAppName] = useState('ARTa - BKAD');
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appSubtitle1, setAppSubtitle1] = useState('(Aplikasi Registrasi Tagihan)');
  const [appSubtitle2, setAppSubtitle2] = useState('Pemerintah Daerah Kabupaten Gorontalo');

  // NEW STATES FOR OTP LOGIN
  const [showOtpFlow, setShowOtpFlow] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const fetchLoginSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = new Map(data.map(item => [item.key, item.value]));
      const fetchedSettings = {
        login_background_url: settingsMap.get('login_background_url') || '',
        login_form_position: settingsMap.get('login_form_position') || 'center',
        login_layout_random: settingsMap.get('login_layout_random') || 'false',
        login_background_effect: settingsMap.get('login_background_effect') || 'false',
        login_background_slider: settingsMap.get('login_background_slider') || 'false',
        login_background_blur: settingsMap.get('login_background_blur') || 'false',
        login_show_forgot_password: settingsMap.get('login_show_forgot_password') || 'true',
        login_show_signup: settingsMap.get('login_show_signup') || 'true',
        login_show_email_password: settingsMap.get('login_show_email_password') || 'true',
      };
      setLoginSettings(fetchedSettings);

      setAppName(settingsMap.get('app_name') || 'ARTa - BKAD');
      setAppLogoUrl(settingsMap.get('app_logo_url') || null);
      setAppSubtitle1(settingsMap.get('app_subtitle_1') || '(Aplikasi Registrasi Tagihan)');
      setAppSubtitle2(settingsMap.get('app_subtitle_2') || 'Pemerintah Daerah Kabupaten Gorontalo');

      const isRandomLayout = fetchedSettings.login_layout_random === 'true';
      const isSliderActive = fetchedSettings.login_background_slider === 'true';
      setIsSliderEnabled(isSliderActive);

      let resolvedBackground: string | null = null;
      let resolvedFormPosition: string = fetchedSettings.login_form_position;
      let fetchedAllImages: string[] = [];

      if (isRandomLayout) {
        const positions = ['left', 'center', 'right', 'top', 'bottom'];
        resolvedFormPosition = positions[Math.floor(Math.random() * positions.length)];

        const { data: images, error: imageError } = await supabase.storage.from('login-backgrounds').list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

        if (imageError) throw imageError;

        const validImages = images.filter(file => file.name !== '.emptyFolderPlaceholder');
        if (validImages.length > 0) {
          const randomIndex = Math.floor(Math.random() * validImages.length);
          const { data: publicUrlData } = supabase.storage.from('login-backgrounds').getPublicUrl(validImages[randomIndex].name);
          resolvedBackground = publicUrlData.publicUrl;
        } else {
          resolvedBackground = null;
        }
        setAllBackgroundImages([]);
        setCurrentImageIndex(0);
      } else if (isSliderActive) {
        const { data: images, error: imageError } = await supabase.storage.from('login-backgrounds').list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

        if (imageError) throw imageError;

        const validImages = images.filter(file => file.name !== '.emptyFolderPlaceholder');
        fetchedAllImages = validImages.map(file => {
          const { data: publicUrlData } = supabase.storage.from('login-backgrounds').getPublicUrl(file.name);
          return publicUrlData.publicUrl;
        });
        setAllBackgroundImages(fetchedAllImages);

        if (fetchedAllImages.length > 0) {
          resolvedBackground = fetchedAllImages[0];
        } else {
          resolvedBackground = null;
        }
        setCurrentImageIndex(0);
      } else {
        resolvedBackground = fetchedSettings.login_background_url;
        setAllBackgroundImages([]);
        setCurrentImageIndex(0);
      }

      setCurrentBackground(resolvedBackground);
      setCurrentFormPosition(resolvedFormPosition);

    } catch (error: any) {
      setLoginSettings({
        login_background_url: '',
        login_form_position: 'center',
        login_layout_random: 'false',
        login_background_effect: 'false',
        login_background_slider: 'false',
        login_background_blur: 'false',
        login_show_forgot_password: 'true',
        login_show_signup: 'true',
        login_show_email_password: 'true',
      });
      setCurrentBackground(null);
      setCurrentFormPosition('center');
      setAllBackgroundImages([]);
      setIsSliderEnabled(false);
      setCurrentImageIndex(0);
      setAppName('ARTa - BKAD');
      setAppLogoUrl(null);
      setAppSubtitle1('(Aplikasi Registrasi Tagihan)');
      setAppSubtitle2('Pemerintah Daerah Kabupaten Gorontalo');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchLoginSettings();
  }, [fetchLoginSettings]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isSliderEnabled && allBackgroundImages.length > 1) {
      intervalId = setInterval(() => {
        setBackgroundOpacity(0);
        setTimeout(() => {
          setCurrentImageIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBackgroundImages.length;
            return nextIndex;
          });
          setBackgroundOpacity(1);
        }, 1000);
      }, 10000);
    } else {
      clearInterval(intervalId);
      setBackgroundOpacity(1);
    }
    return () => clearInterval(intervalId);
  }, [isSliderEnabled, allBackgroundImages.length]);

  useEffect(() => {
    if (isSliderEnabled && allBackgroundImages.length > 0) {
      setCurrentBackground(allBackgroundImages[currentImageIndex]);
    } else if (!isSliderEnabled && loginSettings.login_background_url) {
      setCurrentBackground(loginSettings.login_background_url);
    }
  }, [currentImageIndex, isSliderEnabled, allBackgroundImages, loginSettings.login_background_url]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      // Handle error silently or with toast notification if needed
    }
  };

  const handleLoginWithOtp = () => {
    setShowOtpFlow(prev => !prev);
    setOtpEmail('');
    setOtpSent(false);
    setOtpCode('');
  };

  const sendOtpToEmail = async () => {
    if (!otpEmail) {
      toast.error('Email wajib diisi.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(otpEmail)) {
      toast.error('Format email tidak valid.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        throw error;
      }

      setOtpSent(true);
      toast.success('Kode OTP telah dikirim ke email Anda. Silakan periksa kotak masuk.');
    } catch (error: any) {
      console.error('Error sending OTP:', error.message);
      toast.error('Gagal mengirim kode OTP: ' + error.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpEmail || !otpCode) {
      toast.error('Email dan Kode OTP wajib diisi.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'email',
      });

      if (error) {
        throw error;
      }

      toast.success('Verifikasi OTP berhasil! Anda akan diarahkan.');
    } catch (error: any) {
      console.error('Error verifying OTP:', error.message);
      toast.error('Gagal memverifikasi kode OTP: ' + error.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const loginContainerClasses = cn(
    "min-h-screen flex flex-col p-4 relative overflow-hidden bg-gray-50 dark:bg-gray-900",
    {
      'items-center justify-center': currentFormPosition === 'center',
      'items-start justify-center': currentFormPosition === 'left',
      'items-end justify-center': currentFormPosition === 'right',
      'items-center justify-start pt-20': currentFormPosition === 'top',
      'items-center justify-end pb-20': currentFormPosition === 'bottom',
    }
  );

  const backgroundStyle: React.CSSProperties = currentBackground
    ? {
        backgroundImage: `url(${currentBackground})`,
        opacity: backgroundOpacity,
        filter: loginSettings.login_background_blur === 'true' ? 'blur(8px)' : 'none',
      }
    : { opacity: backgroundOpacity, filter: loginSettings.login_background_blur === 'true' ? 'blur(8px)' : 'none' };

  const backgroundOverlayClasses = cn(
    "absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out",
  );

  const formContainerClasses = cn(
    "w-full max-w-md p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 z-10",
    {
      'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm': loginSettings.login_background_effect === 'true',
      'bg-white dark:bg-gray-800': loginSettings.login_background_effect !== 'true',
    }
  );

  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
      </div>
    );
  }

  return (
    <div className={loginContainerClasses}>
      {currentBackground && (
        <div
          className={backgroundOverlayClasses}
          style={backgroundStyle}
        ></div>
      )}

      <div className={formContainerClasses}>
        <div className="text-center mb-4 flex items-center justify-center gap-2">
          {appLogoUrl && (
            <div className="flex-shrink-0">
              <img src={appLogoUrl} alt="App Logo" className="h-12 w-12 object-contain" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{appName}</h2>
        </div>

        <div className="text-lg text-gray-600 dark:text-gray-400 mb-1 text-center">
          <ReactMarkdown>{appSubtitle1}</ReactMarkdown>
        </div>
        <div className="text-md text-gray-600 dark:text-gray-400 mb-6 text-center">
          <ReactMarkdown>{appSubtitle2}</ReactMarkdown>
        </div>

        {!showOtpFlow && loginSettings.login_show_email_password === 'true' && (
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(217.2 91.2% 59.8%)',
                    brandAccent: 'hsl(217.2 91.2% 49.8%)',
                    inputBackground: 'hsl(0 0% 100%)',
                    inputBorder: 'hsl(214.3 31.8% 91.4%)',
                    inputBorderHover: 'hsl(217.2 91.2% 59.8%)',
                    inputBorderFocus: 'hsl(217.2 91.2% 59.8%)',
                    inputText: 'hsl(222.2 84% 4.9%)',
                  },
                },
              },
            }}
            theme="light"
            redirectTo={window.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email Anda',
                  password_label: 'Password Anda',
                  email_input_placeholder: 'Masukkan email',
                  password_input_placeholder: 'Masukkan password',
                  button_label: 'Login',
                  social_auth_button_text: 'Login dengan {{provider}}',
                  link_text: loginSettings.login_show_signup === 'true' ? 'Sudah punya akun? Login' : '',
                },
                sign_up: {
                  email_label: 'Email Anda',
                  password_label: 'Buat Password',
                  email_input_placeholder: 'Masukkan email',
                  password_input_placeholder: 'Buat password',
                  button_label: 'Daftar',
                  social_auth_button_text: 'Daftar dengan {{provider}}',
                  link_text: loginSettings.login_show_signup === 'true' ? 'Belum punya akun? Daftar' : '',
                },
                forgotten_password: {
                  email_label: 'Email Anda',
                  password_label: 'Password Baru',
                  email_input_placeholder: 'Masukkan email Anda',
                  button_label: 'Kirim instruksi reset password',
                  link_text: loginSettings.login_show_forgot_password === 'true' ? 'Lupa password?' : '',
                },
                update_password: {
                  password_label: 'Password Baru',
                  password_input_placeholder: 'Masukkan password baru Anda',
                  button_label: 'Perbarui password',
                },
              },
            }}
          />
        )}

        {/* OTP Login Flow */}
        {showOtpFlow && (
          <div className="space-y-4">
            {!otpSent ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Masukkan email Anda untuk menerima kode login.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="otp-email">Email</Label>
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    disabled={isSendingOtp}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={sendOtpToEmail}
                  disabled={isSendingOtp}
                >
                  {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kirim Kode OTP
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  Kode OTP telah dikirim ke <span className="font-semibold">{otpEmail}</span>. Silakan periksa kotak masuk Anda.
                </p>
                <div className="grid gap-2 justify-center">
                  <Label htmlFor="otp-code" className="text-center">Kode OTP</Label>
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                    disabled={isVerifyingOtp}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50" />
                      <InputOTPSlot index={1} className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50" />
                      <InputOTPSlot index={2} className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50" />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={3} className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50" />
                      <InputOTPSlot index={4} className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50" />
                      <InputOTPSlot index={5} className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-50" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  className="w-full"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp || otpCode.length !== 6}
                >
                  {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verifikasi Kode
                </Button>
                <Button
                  variant="link"
                  className="w-full text-blue-600 dark:text-blue-400"
                  onClick={sendOtpToEmail}
                  disabled={isSendingOtp || isVerifyingOtp}
                >
                  {isSendingOtp ? 'Mengirim Ulang...' : 'Kirim Ulang Kode'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Separator and Social/OTP Buttons */}
        {(!showOtpFlow && loginSettings.login_show_email_password === 'true') && (
          <div className="relative flex justify-center text-xs uppercase my-6">
            <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">Atau lanjutkan dengan</span>
          </div>
        )}
        
        {!showOtpFlow && (
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
          >
            {/* Google Icon SVG - Disesuaikan untuk tampilan yang lebih rapi */}
            <svg className="h-4 w-4 flex-shrink-0 align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.49 22.49 10.75 22.37 10.02H12V14.45H18.48C18.18 16.09 17.26 17.44 16.01 18.29V21.29H20.06C22.44 19.18 23.81 15.96 23.81 12.25C23.81 11.58 23.75 10.92 23.64 10.28C23.53 9.64 23.38 9.02 23.2 8.42H12V4.02H22.37C22.49 4.75 22.56 5.49 22.56 6.25C22.56 6.92 22.5 7.58 22.39 8.22C22.28 8.86 22.13 9.48 21.95 10.08L22.56 12.25Z" fill="#4285F4"/>
              <path d="M12 23.81C15.24 23.81 17.99 22.73 20.06 21.29L16.01 18.29C14.92 19.03 13.59 19.49 12 19.49C9.08 19.49 6.56 17.59 5.62 14.93H1.48V18.93C3.55 22.93 7.55 23.81 12 23.81Z" fill="#34A853"/>
              <path d="M5.62 14.93C5.38 14.27 5.25 13.59 5.25 12.81C5.25 12.03 5.38 11.35 5.62 10.69V6.69H1.48C0.54 8.69 0 10.69 0 12.81C0 14.93 0.54 16.93 1.48 18.93L5.62 14.93Z" fill="#FBBC05"/>
              <path d="M12 4.02C13.77 4.02 15.35 4.68 16.61 5.82L20.16 2.27C17.99 0.83 15.24 0 12 0C7.55 0 3.55 0.88 1.48 4.88L5.62 8.88C6.56 6.22 9.08 4.02 12 4.02Z" fill="#EA4335"/>
            </svg>
            Login with Google
          </Button>
        )}

        {/* Toggle button for OTP Login - Styled to match Google button */}
        <Button
          variant="outline"
          className="w-full mt-2 flex items-center justify-center gap-2"
          onClick={handleLoginWithOtp}
        >
          {/* Email Icon SVG - Disesuaikan untuk tampilan yang lebih rapi */}
          <svg className="h-4 w-4 flex-shrink-0 align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 5H22C22.5523 5 23 5.44772 23 6V18C23 18.5523 22.5523 19 22 19H2C1.44772 19 1 18.5523 1 18V6C1 5.44772 1.44772 5 2 5Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M23 6L12 12L1 6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {showOtpFlow ? 'Kembali ke Opsi Login' : 'Login dengan Kode OTP'}
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;