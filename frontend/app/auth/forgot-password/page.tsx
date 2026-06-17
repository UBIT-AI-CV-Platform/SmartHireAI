'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import FormInput from '@/components/auth/FormInput';
import Logo from '@/components/auth/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setIsLoading(false);
      return;
    }
    setSent(true);
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4">
      <Link
        href="/auth"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/70 text-gray-700 hover:bg-white hover:text-primary transition-all duration-300 shadow-lg group"
        aria-label="Back to login"
      >
        <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:-translate-x-0.5">west</span>
      </Link>

      <div className="w-full max-w-md bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 auth-animated-gradient rounded-2xl shadow-2xl p-6 md:p-8 auth-fade-up">
        <div className="text-center mb-6">
          <Logo />
        </div>

        {sent ? (
          <div className="text-center auth-pop">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-3xl">mark_email_read</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">Check your email</h1>
            <p className="text-gray-600 text-xs md:text-sm mb-6">
              We&apos;ve sent a password reset link to <span className="font-semibold text-gray-800">{email}</span>.
              Open the link to set a new password.
            </p>
            <Link
              href="/auth"
              className="inline-block w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <h1 className="text-lg font-bold text-gray-900 mb-1">Forgot password?</h1>
              <p className="text-gray-600 text-xs md:text-sm">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <FormInput
                label="Email Address"
                icon="mail"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0">error</span>
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-xs text-gray-600">
                Remember it?{' '}
                <Link href="/auth" className="text-primary font-semibold hover:text-primary/80 transition-colors">
                  Back to Login
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
