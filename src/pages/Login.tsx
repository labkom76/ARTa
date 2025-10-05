import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Button } from '@/components/ui/button'; // Import Button component
import { ChromeIcon } from 'lucide-react'; // Import Google icon (using ChromeIcon as a generic browser/Google icon)

const Login = () => {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Redirect to the root of your app after login
      },
    });

    if (error) {
      console.error('Error logging in with Google:', error.message);
      // Optionally show a toast notification for the error
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">ARTa - BKAD</h2>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-1">(Aplikasi Registrasi Tagihan)</p>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">Pemerintah Daerah Kabupaten Gorontalo</p>
        <Auth
          supabaseClient={supabase}
          providers={[]} // Keep providers empty as we're adding a custom Google button
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(217.2 91.2% 59.8%)', // Blue accent
                  brandAccent: 'hsl(217.2 91.2% 49.8%)', // Darker blue
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
          redirectTo={window.location.origin} // Redirect to root after login, SessionContext will handle further role-based redirect
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