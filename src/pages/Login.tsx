import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ChromeIcon, Loader2, MailIcon } from 'lucide-react';
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
            <ChromeIcon className="h-5 w-5" />
            Login with Google
          </Button>
        )}

        {/* Toggle button for OTP Login - Styled to match Google button */}
        <Button
          variant="outline"
          className="w-full mt-2 flex items-center justify-center gap-2"
          onClick={handleLoginWithOtp}
        >
          <MailIcon className="h-5 w-5" />
          {showOtpFlow ? 'Kembali ke Opsi Login' : 'Login dengan Kode OTP'}
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;