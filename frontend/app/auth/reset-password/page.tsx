'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getPortalPath } from '@/lib/auth-helpers';
import FormInput from '@/components/auth/FormInput';
import Logo from '@/components/auth/Logo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);      // recovery session established?
  const [linkError, setLinkError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conditions = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const allConditionsMet = Object.values(conditions).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirm;

  // Exchange the recovery code in the URL for a session
  useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get('code');

    const init = async () => {
      // already have a recovery session?
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setReady(true); return; }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) { setReady(true); return; }
      }
      setLinkError(true);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allConditionsMet) { setError('Password is not strong enough.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    // password changed — send them into their portal
    const path = await getPortalPath(supabase);
    router.push(path);
    router.refresh();
  };

  return (
    <div className="relative min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 auth-animated-gradient rounded-2xl shadow-2xl p-6 md:p-8 auth-fade-up">
        <div className="text-center mb-6"><Logo /></div>

        {linkError ? (
          <div className="text-center auth-pop">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-3xl">link_off</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Link invalid or expired</h1>
            <p className="text-gray-600 text-xs md:text-sm mb-6">This reset link is no longer valid. Please request a new one.</p>
            <Link href="/auth/forgot-password" className="inline-block w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all">
              Request New Link
            </Link>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
            </div>
            <p className="text-xs text-gray-500 font-medium">Verifying link...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <h1 className="text-lg font-bold text-gray-900 mb-1">Set new password</h1>
              <p className="text-gray-600 text-xs md:text-sm">Choose a new strong password for your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <FormInput label="New Password" icon="lock" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                {password.length > 0 && (
                  <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <Cond met={conditions.hasMinLength} text="8+ characters" />
                    <Cond met={conditions.hasUpperCase} text="Uppercase" />
                    <Cond met={conditions.hasLowerCase} text="Lowercase" />
                    <Cond met={conditions.hasNumber} text="Number" />
                    <Cond met={conditions.hasSpecialChar} text="Special char" />
                  </div>
                )}
              </div>

              <FormInput label="Confirm Password" icon="lock" type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-[11px] text-red-600 font-medium -mt-1">Passwords do not match.</p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0">error</span>
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !allConditionsMet || !passwordsMatch}
                className="w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Cond({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={`material-symbols-outlined text-[14px] flex-shrink-0 ${met ? 'text-green-500' : 'text-red-500'}`}>
        {met ? 'check_circle' : 'cancel'}
      </span>
      <span className={`text-[10px] md:text-[11px] ${met ? 'text-green-600' : 'text-red-600'}`}>{text}</span>
    </div>
  );
}
