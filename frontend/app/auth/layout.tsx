import ThemeToggle from '@/components/shared/ThemeToggle'

export const metadata = {
  title: 'SmartHire AI - Authentication',
  description: 'Sign in or create an account to access SmartHire AI',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Theme toggle, top-right on every auth route (login, forgot/reset password, select-role) */}
      <ThemeToggle className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full flex items-center justify-center bg-white/80 dark:bg-white/10 backdrop-blur border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-200 shadow-sm hover:bg-white dark:hover:bg-white/20 transition-colors" />
      {children}
    </>
  );
}
