import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button';
import { ChromeIcon } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils'; // Import cn utility for class merging

const Login = () => {
  const [loginSettings, setLoginSettings] = useState({
    login_background_url: '',
    login_form_position: 'center',
    login_layout_random: 'false',
    login_background_effect: 'false',
    login_background_slider: 'false', // New setting
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null); // Stores the actual background URL to use
  const [currentFormPosition, setCurrentFormPosition] = useState<string>('center'); // Stores the actual form position to use
  const [allBackgroundImages, setAllBackgroundImages] = useState<string[]>([]); // Stores all image URLs for slider
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // Current index for slider
  const [isSliderEnabled, setIsSliderEnabled] = useState(false); // State to control slider logic
  const [backgroundOpacity, setBackgroundOpacity] = useState(1); // New state for opacity to control fade

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
        login_background_slider: settingsMap.get('login_background_slider') || 'false', // Get new setting
      };
      setLoginSettings(fetchedSettings);
      console.log('Fetched settings:', fetchedSettings);

      const isRandomLayout = fetchedSettings.login_layout_random === 'true';
      const isSliderActive = fetchedSettings.login_background_slider === 'true';
      setIsSliderEnabled(isSliderActive);
      console.log('isSliderActive:', isSliderActive, 'isRandomLayout:', isRandomLayout);

      let resolvedBackground: string | null = null;
      let resolvedFormPosition: string = fetchedSettings.login_form_position;
      let fetchedAllImages: string[] = [];

      if (isRandomLayout) {
        // Random layout takes precedence for single image selection
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
        setAllBackgroundImages([]); // Clear slider images if random is active
        setCurrentImageIndex(0); // Reset index
      } else if (isSliderActive) {
        // If slider is active, fetch all images
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
        console.log('Fetched all background images for slider:', fetchedAllImages);

        if (fetchedAllImages.length > 0) {
          resolvedBackground = fetchedAllImages[0]; // Set initial background for slider
        } else {
          resolvedBackground = null;
        }
        setCurrentImageIndex(0); // Reset index
      } else {
        // Default: use single configured background
        resolvedBackground = fetchedSettings.login_background_url;
        setAllBackgroundImages([]); // Clear slider images
        setCurrentImageIndex(0); // Reset index
      }

      setCurrentBackground(resolvedBackground);
      setCurrentFormPosition(resolvedFormPosition);

    } catch (error: any) {
      console.error('Error fetching login settings:', error.message);
      setLoginSettings({
        login_background_url: '',
        login_form_position: 'center',
        login_layout_random: 'false',
        login_background_effect: 'false',
        login_background_slider: 'false',
      });
      setCurrentBackground(null);
      setCurrentFormPosition('center');
      setAllBackgroundImages([]);
      setIsSliderEnabled(false);
      setCurrentImageIndex(0);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchLoginSettings();
  }, [fetchLoginSettings]);

  // Effect for background image slider with fade transition
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isSliderEnabled && allBackgroundImages.length > 1) {
      console.log('Slider enabled, starting interval. Images:', allBackgroundImages.length);
      intervalId = setInterval(() => {
        setBackgroundOpacity(0); // Start fade out
        setTimeout(() => {
          setCurrentImageIndex(prevIndex => {
            const nextIndex = (prevIndex + 1) % allBackgroundImages.length;
            console.log('Changing image to index:', nextIndex);
            return nextIndex;
          });
          setBackgroundOpacity(1); // Fade in new image
        }, 1000); // Wait for fade out (1s) before changing image and fading in
      }, 10000); // Change image every 10 seconds (total cycle: 1s fade out, 9s display, 1s fade in)
    } else {
      console.log('Slider not enabled or not enough images for slider. Clearing interval.');
      clearInterval(intervalId);
      setBackgroundOpacity(1); // Ensure opacity is 1 if slider is off
    }
    return () => clearInterval(intervalId);
  }, [isSliderEnabled, allBackgroundImages.length]);

  // Effect to update currentBackground when currentImageIndex changes (for slider)
  useEffect(() => {
    if (isSliderEnabled && allBackgroundImages.length > 0) {
      setCurrentBackground(allBackgroundImages[currentImageIndex]);
      console.log('Current background updated to:', allBackgroundImages[currentImageIndex]);
    } else if (!isSliderEnabled && loginSettings.login_background_url) {
      // If slider is disabled, revert to the single selected background
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
      'items-center justify-start pt-20': currentFormPosition === 'top',
      'items-center justify-end pb-20': currentFormPosition === 'bottom',
    }
  );

  const backgroundStyle = currentBackground
    ? { backgroundImage: `url(${currentBackground})`, opacity: backgroundOpacity }
    : { opacity: backgroundOpacity }; // Apply opacity even if no background image

  const backgroundOverlayClasses = cn(
    "absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out", // Added transition for fade effect
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

      <div className={formContainerClasses}>
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