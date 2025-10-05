import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ChromeIcon } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils'; // Import cn utility for class merging

const Login = () => {
  const [loginSettings, setLoginSettings] = useState({
    login_background_url: '',
    login_form_position: 'center',
    login_layout_random: 'false',
    login_background_effect: 'false',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null); // Stores the actual background URL to use
  const [currentFormPosition, setCurrentFormPosition] = useState<string>('center'); // Stores the actual form position to use

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
      };
      setLoginSettings(fetchedSettings);

      let resolvedBackground: string | null = null;
      let resolvedFormPosition: string = fetchedSettings.login_form_position;

      // Handle random layout logic
      if (fetchedSettings.login_layout_random === 'true') {
        // Pick a random position
        const positions = ['left', 'center', 'right', 'top', 'bottom'];
        resolvedFormPosition = positions[Math.floor(Math.random() * positions.length)];

        // Pick a random background image from storage
        const { data: images, error: imageError } = await supabase.storage.from('login-backgrounds').list('', {
          limit: 100, // Adjust limit as needed
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
          resolvedBackground = null; // No images to pick from
        }
      } else {
        // Use configured background and position
        resolvedBackground = fetchedSettings.login_background_url;
      }

      setCurrentBackground(resolvedBackground);
      setCurrentFormPosition(resolvedFormPosition);

    } catch (error: any) {
      console.error('Error fetching login settings:', error.message);
      // Fallback to default settings on error
      setLoginSettings({
        login_background_url: '',
        login_form_position: 'center',
        login_layout_random: 'false',
        login_background_effect: 'false',
      });
      setCurrentBackground(null);
      setCurrentFormPosition('center');
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchLoginSettings();
  }, [fetchLoginSettings]);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      console.error('Error logging in with Google:', error.message);
    }
  };

  // Dynamic classes for the main container
  const loginContainerClasses = cn(
    "min-h-screen flex flex-col p-4 relative overflow-hidden bg-gray-50 dark:bg-gray-900",
    {
      'items-center justify-center': currentFormPosition === 'center',
      'items-start justify-center': currentFormPosition === 'left',
      'items-end justify-center': currentFormPosition === 'right',
      'items-center justify-start pt-20': currentFormPosition === 'top', // Add padding for visual offset
      'items-center justify-end pb-20': currentFormPosition === 'bottom', // Add padding for visual offset
    }
  );

  const backgroundStyle = currentBackground
    ? { backgroundImage: `url(${currentBackground})` }
    : {};

  // Removed filter from backgroundOverlayClasses as per user's request for backdrop-filter on form
  const backgroundOverlayClasses = cn(
    "absolute inset-0 bg-cover bg-center transition-all duration-500",
  );

  // Classes for the form container
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
        <p className="text-gray-600 dark:text-gray-400">Memuat pengaturan login...</p>
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

      <div className={formContainerClasses}> {/* Applied dynamic classes here */}
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">ARTa - BKAD</h2>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-1">(Aplikasi Registrasi Tagihan)</p>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">Pemerintah Daerah Kabupaten Gorontalo</p>
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
                link_text: 'Sudah punya akun? Login',
              },
              sign_up: {
                email_label: 'Email Anda',
                password_label: 'Buat Password',
                email_input_placeholder: 'Masukkan email',
                password_input_placeholder: 'Buat password',
                button_label: 'Daftar',
                social_auth_button_text: 'Daftar dengan {{provider}}',
                link_text: 'Belum punya akun? Daftar',
              },
              forgotten_password: {
                email_label: 'Email Anda',
                password_label: 'Password Baru',
                email_input_placeholder: 'Masukkan email Anda',
                button_label: 'Kirim instruksi reset password',
                link_text: 'Lupa password?',
              },
              update_password: {
                password_label: 'Password Baru',
                password_input_placeholder: 'Masukkan password baru Anda',
                button_label: 'Perbarui password',
              },
            },
          }}
        />
        <div className="relative flex justify-center text-xs uppercase my-6">
          <span className="bg-white dark:bg-gray-800 px-2 text-muted-foreground">Atau lanjutkan dengan</span>
        </div>
        <Button
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={handleGoogleLogin}
        >
          <ChromeIcon className="h-5 w-5" />
          Login with Google
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;