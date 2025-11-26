import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, ChevronRight, Quote, Mail, Smartphone, Globe } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTheme } from "next-themes";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// Testimonial Data (Static for now, could be dynamic later)
const TESTIMONIALS = [
  {
    quote: "ARTa made my administrative tasks a breeze! I found the perfect workflow in no time. Highly recommended!",
    author: "Budi Santoso",
    role: "Kepala Bidang Anggaran"
  },
  {
    quote: "Sistem yang sangat efisien dan mudah digunakan. Mempercepat proses verifikasi tagihan secara signifikan.",
    author: "Siti Rahmawati",
    role: "Verifikator Keuangan"
  },
  {
    quote: "Tampilan baru yang segar dan modern. Sangat membantu dalam monitoring status pengajuan SKPD.",
    author: "Ahmad Hidayat",
    role: "Admin SKPD"
  }
];

const Login = () => {
  const { theme } = useTheme();
  // --- EXISTING STATE & LOGIC ---
  const [loginSettings, setLoginSettings] = useState({
    login_background_url: '',
    login_form_position: 'center', // Kept for compatibility, though layout is now fixed split
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
  const [allBackgroundImages, setAllBackgroundImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSliderEnabled, setIsSliderEnabled] = useState(false);

  const [appName, setAppName] = useState('ARTa - BKAD');
  const [appLogoUrl, setAppLogoUrl] = useState<string | null>(null);
  const [appSubtitle1, setAppSubtitle1] = useState('(Aplikasi Registrasi Tagihan)');
  const [appSubtitle2, setAppSubtitle2] = useState('Pemerintah Daerah Kabupaten Gorontalo');

  // OTP States
  const [otpEmail, setOtpEmail] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // --- NEW UI STATES ---
  // Initialize activeTab based on settings (will be updated in useEffect when settings load)
  const [activeTab, setActiveTab] = useState<'email' | 'otp' | 'social'>('social');
  const [currentTestimonialIndex, setCurrentTestimonialIndex] = useState(0);

  // Fetch Settings
  const fetchLoginSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.from('app_settings').select('key, value');
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

      // Set default tab based on available options (Social is default preference)
      setActiveTab('social');

      setAppName(settingsMap.get('app_name') || 'ARTa - BKAD');
      setAppLogoUrl(settingsMap.get('app_logo_url') || null);
      setAppSubtitle1(settingsMap.get('app_subtitle_1') || '(Aplikasi Registrasi Tagihan)');
      setAppSubtitle2(settingsMap.get('app_subtitle_2') || 'Pemerintah Daerah Kabupaten Gorontalo');

      const isSliderActive = fetchedSettings.login_background_slider === 'true';
      setIsSliderEnabled(isSliderActive);

      let resolvedBackground: string | null = null;
      let fetchedAllImages: string[] = [];

      if (isSliderActive) {
        const { data: images } = await supabase.storage.from('login-backgrounds').list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
        if (images) {
          const validImages = images.filter(file => file.name !== '.emptyFolderPlaceholder');
          fetchedAllImages = validImages.map(file => supabase.storage.from('login-backgrounds').getPublicUrl(file.name).data.publicUrl);
          setAllBackgroundImages(fetchedAllImages);
          if (fetchedAllImages.length > 0) resolvedBackground = fetchedAllImages[0];
        }
      } else {
        resolvedBackground = fetchedSettings.login_background_url;
      }
      setCurrentBackground(resolvedBackground);
    } catch (error) {
      console.error("Error fetching settings", error);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => { fetchLoginSettings(); }, [fetchLoginSettings]);

  // Background Slider Logic
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isSliderEnabled && allBackgroundImages.length > 1) {
      intervalId = setInterval(() => {
        setCurrentImageIndex(prev => (prev + 1) % allBackgroundImages.length);
      }, 5000); // Faster transition for hero carousel
    }
    return () => clearInterval(intervalId);
  }, [isSliderEnabled, allBackgroundImages.length]);

  useEffect(() => {
    if (isSliderEnabled && allBackgroundImages.length > 0) {
      setCurrentBackground(allBackgroundImages[currentImageIndex]);
    }
  }, [currentImageIndex, isSliderEnabled, allBackgroundImages]);

  // Testimonial Slider Logic
  const nextTestimonial = () => setCurrentTestimonialIndex(prev => (prev + 1) % TESTIMONIALS.length);
  const prevTestimonial = () => setCurrentTestimonialIndex(prev => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  // Auth Handlers
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Gagal login Google");
  };

  const sendOtpToEmail = async () => {
    if (!otpEmail) return toast.error('Email wajib diisi.');
    setIsSendingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success('Kode OTP telah dikirim ke email Anda.');
    } catch (error: any) {
      toast.error('Gagal mengirim OTP: ' + error.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpEmail || !otpCode) return toast.error('Email dan Kode OTP wajib diisi.');
    setIsVerifyingOtp(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'email',
      });
      if (error) throw error;
      toast.success('Login berhasil!');
    } catch (error: any) {
      toast.error('Gagal verifikasi OTP: ' + error.message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Render different layouts based on login_form_position setting
  if (loginSettings.login_form_position === 'center') {
    // CENTER LAYOUT - EXISTING IMPLEMENTATION (DO NOT MODIFY)
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden">
        {/* Background Image with Blur */}
        {currentBackground && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentBackground})`,
              filter: loginSettings.login_background_blur === 'true' ? 'blur(8px)' : 'none',
              opacity: 0.15
            }}
          />
        )}

        {/* Centered Form Container */}
        <div className="relative z-10 w-full max-w-md mx-auto px-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                {appLogoUrl ? (
                  <img src={appLogoUrl} alt="Logo" className="h-12 w-12 object-contain" />
                ) : (
                  <div className="h-12 w-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">
                    A
                  </div>
                )}
                <span className="text-2xl font-bold tracking-tight">{appName}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Selamat Datang Kembali</h1>
              <div className="text-slate-500 dark:text-slate-400 prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>
                  {appSubtitle1 + ' ' + appSubtitle2}
                </ReactMarkdown>
              </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-8">
              <button
                onClick={() => setActiveTab('social')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  activeTab === 'social' ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Globe className="h-4 w-4" />
                Social
              </button>
              <button
                onClick={() => setActiveTab('otp')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  activeTab === 'otp' ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                <Smartphone className="h-4 w-4" />
                OTP
              </button>
              {loginSettings.login_show_email_password === 'true' && (
                <button
                  onClick={() => setActiveTab('email')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    activeTab === 'email' ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  )}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="min-h-[300px]">
              {/* EMAIL LOGIN */}
              {activeTab === 'email' && loginSettings.login_show_email_password === 'true' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Auth
                    supabaseClient={supabase}
                    providers={[]}
                    appearance={{
                      theme: ThemeSupa,
                      variables: {
                        default: {
                          colors: {
                            brand: '#10b981',
                            brandAccent: '#059669',
                            inputBackground: 'white',
                            inputBorder: '#e2e8f0',
                            inputBorderHover: '#10b981',
                            inputBorderFocus: '#10b981',
                          },
                          radii: {
                            borderRadiusButton: '0.5rem',
                            inputBorderRadius: '0.5rem',
                          }
                        },
                      },
                      className: {
                        button: 'h-11 font-medium',
                        input: 'h-11',
                      },
                    }}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    redirectTo={window.location.origin}
                    localization={{
                      variables: {
                        sign_in: {
                          email_label: 'Email Address',
                          password_label: 'Password',
                          button_label: 'Sign In',
                          link_text: loginSettings.login_show_signup === 'true' ? 'Don\'t have an account? Sign up' : '',
                        },
                        forgotten_password: {
                          link_text: loginSettings.login_show_forgot_password === 'true' ? 'Forgot your password?' : '',
                        },
                        sign_up: {
                          link_text: loginSettings.login_show_signup === 'true' ? 'Already have an account? Sign in' : '',
                        }
                      }
                    }}
                  />
                </div>
              )}

              {/* OTP LOGIN */}
              {activeTab === 'otp' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {!otpSent ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="otp-email">Email Address</Label>
                        <Input
                          id="otp-email"
                          type="email"
                          placeholder="name@example.com"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          className="h-11 dark:bg-slate-900 dark:border-slate-800"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Kami akan mengirimkan kode verifikasi ke email anda.</p>
                      </div>
                      <Button
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        onClick={sendOtpToEmail}
                        disabled={isSendingOtp}
                      >
                        {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continue
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-center space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Enter the code sent to <span className="font-semibold text-slate-900 dark:text-white">{otpEmail}</span></p>
                      </div>
                      <div className="flex justify-center py-4">
                        <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                          <InputOTPGroup>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                              <InputOTPSlot key={i} index={i} className="h-12 w-10 border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500 dark:text-white" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <Button
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        onClick={handleVerifyOtp}
                        disabled={isVerifyingOtp || otpCode.length !== 6}
                      >
                        {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify & Login
                      </Button>
                      <Button variant="ghost" className="w-full text-slate-500 hover:text-emerald-600" onClick={() => setOtpSent(false)}>
                        Change Contact Info
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* SOCIAL LOGIN */}
              {activeTab === 'social' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">Hubungkan dengan akun sosial favorit Anda</p>
                  <Button
                    variant="outline"
                    className="w-full h-12 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800 dark:text-slate-200 dark:bg-transparent"
                    onClick={handleGoogleLogin}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Dyad Badge */}
          <div className="mt-8 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
            <MadeWithDyad />
          </div>
        </div>
      </div>
    );
  }

  // SPLIT-SCREEN LAYOUT (supports 'left' and 'right' positions)
  const isFormOnLeft = loginSettings.login_form_position === 'left';

  // Hero Section Component
  const HeroSection = () => (
    <div className={cn(
      "relative w-full lg:w-[55%] h-[40vh] lg:h-screen flex items-center justify-center lg:p-[0.4rem]",
      isFormOnLeft ? "order-2 lg:order-2" : "order-1 lg:order-1"
    )}>
      <div className="relative w-full h-full bg-slate-900 overflow-hidden lg:rounded-3xl lg:border-2 lg:border-white dark:lg:border-slate-700">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${currentBackground || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80'})`,
            filter: 'brightness(0.7)'
          }}
        />

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-16 text-white z-10">
          <div className="max-w-xl">
            <Quote className="h-10 w-10 text-emerald-400 mb-6 opacity-80" />

            <div className="min-h-[120px]">
              <h2 className="text-2xl lg:text-3xl font-medium leading-tight mb-6 tracking-tight">
                "{TESTIMONIALS[currentTestimonialIndex].quote}"
              </h2>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="font-semibold text-lg">{TESTIMONIALS[currentTestimonialIndex].author}</p>
                <p className="text-slate-300 text-sm">{TESTIMONIALS[currentTestimonialIndex].role}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={prevTestimonial}
                  className="p-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="p-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Form Section Component
  const FormSection = () => (
    <div className={cn(
      "w-full lg:w-[45%] flex flex-col justify-center px-6 py-12 lg:px-16 bg-white dark:bg-slate-950 relative",
      isFormOnLeft ? "order-1 lg:order-1" : "order-2 lg:order-2"
    )}>
      <div className="max-w-md w-full mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="Logo" className="h-10 w-10 object-contain" />
            ) : (
              <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                A
              </div>
            )}
            <span className="text-xl font-bold tracking-tight">{appName}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Selamat Datang Kembali</h1>

          <div className="text-slate-500 dark:text-slate-400 prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>
              {appSubtitle1 + ' ' + appSubtitle2}
            </ReactMarkdown>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl mb-8">
          <button
            onClick={() => setActiveTab('social')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
              activeTab === 'social' ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Globe className="h-4 w-4" />
            Social
          </button>
          <button
            onClick={() => setActiveTab('otp')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
              activeTab === 'otp' ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Smartphone className="h-4 w-4" />
            OTP
          </button>
          {loginSettings.login_show_email_password === 'true' && (
            <button
              onClick={() => setActiveTab('email')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                activeTab === 'email' ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* EMAIL LOGIN */}
          {activeTab === 'email' && loginSettings.login_show_email_password === 'true' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Auth
                supabaseClient={supabase}
                providers={[]}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: '#10b981',
                        brandAccent: '#059669',
                        inputBackground: 'white',
                        inputBorder: '#e2e8f0',
                        inputBorderHover: '#10b981',
                        inputBorderFocus: '#10b981',
                      },
                      radii: {
                        borderRadiusButton: '0.5rem',
                        inputBorderRadius: '0.5rem',
                      }
                    },
                  },
                  className: {
                    button: 'h-11 font-medium',
                    input: 'h-11',
                  },
                }}
                theme={theme === 'dark' ? 'dark' : 'light'}
                redirectTo={window.location.origin}
                localization={{
                  variables: {
                    sign_in: {
                      email_label: 'Email Address',
                      password_label: 'Password',
                      button_label: 'Sign In',
                      link_text: loginSettings.login_show_signup === 'true' ? 'Don\'t have an account? Sign up' : '',
                    },
                    forgotten_password: {
                      link_text: loginSettings.login_show_forgot_password === 'true' ? 'Forgot your password?' : '',
                    },
                    sign_up: {
                      link_text: loginSettings.login_show_signup === 'true' ? 'Already have an account? Sign in' : '',
                    }
                  }
                }}
              />
            </div>
          )}

          {/* OTP LOGIN */}
          {activeTab === 'otp' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email Address</Label>
                    <Input
                      id="otp-email"
                      type="email"
                      placeholder="name@example.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="h-11 dark:bg-slate-900 dark:border-slate-800"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Kami akan mengirimkan kode verifikasi ke email anda.</p>
                  </div>
                  <Button
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    onClick={sendOtpToEmail}
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Enter the code sent to <span className="font-semibold text-slate-900 dark:text-white">{otpEmail}</span></p>
                  </div>
                  <div className="flex justify-center py-4">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="h-12 w-10 border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500 dark:text-white" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                  >
                    {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Login
                  </Button>
                  <Button variant="ghost" className="w-full text-slate-500 hover:text-emerald-600" onClick={() => setOtpSent(false)}>
                    Change Contact Info
                  </Button>
                </>
              )}
            </div>
          )}

          {/* SOCIAL LOGIN */}
          {activeTab === 'social' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">Hubungkan dengan akun sosial favorit Anda</p>
              <Button
                variant="outline"
                className="w-full h-12 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-800 dark:text-slate-200 dark:bg-transparent"
                onClick={handleGoogleLogin}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dyad Badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-50 hover:opacity-100 transition-opacity">
        <MadeWithDyad />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-white">
      <HeroSection />
      <FormSection />
    </div>
  );
};

export default Login;