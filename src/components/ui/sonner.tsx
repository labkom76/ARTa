import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      duration={4000}
      toastOptions={{
        unstyled: false,
        duration: 4000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-900 dark:group-[.toaster]:text-slate-100 group-[.toaster]:border group-[.toaster]:border-slate-200 dark:group-[.toaster]:border-slate-800 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:transition-all group-[.toaster]:duration-300 group-[.toaster]:ease-in-out data-[state=closed]:!duration-500 data-[state=closed]:!fade-out-0 data-[state=closed]:!slide-out-to-right-full",
          title: "!text-slate-900 dark:!text-slate-100 !font-semibold",
          description: "!text-slate-600 dark:!text-slate-400",
          actionButton:
            "group-[.toast]:bg-emerald-600 group-[.toast]:text-white group-[.toast]:hover:bg-emerald-700 group-[.toast]:rounded-lg group-[.toast]:font-medium group-[.toast]:transition-colors",
          cancelButton:
            "group-[.toast]:bg-slate-100 dark:group-[.toast]:bg-slate-800 group-[.toast]:text-slate-700 dark:group-[.toast]:text-slate-300 group-[.toast]:hover:bg-slate-200 dark:group-[.toast]:hover:bg-slate-700 group-[.toast]:rounded-lg group-[.toast]:transition-colors",
          success: "!text-slate-900 dark:!text-slate-100",
          error: "!text-slate-900 dark:!text-slate-100",
          warning: "!text-slate-900 dark:!text-slate-100",
          info: "!text-slate-900 dark:!text-slate-100",
        },
      }}
      icons={{
        success: <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>,
        error: <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
          <svg className="h-3 w-3 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>,
        warning: <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
          <svg className="h-3 w-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>,
        info: <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
          <svg className="h-3 w-3 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>,
      }}
      {...props}
    />
  );
};

export { Toaster };
