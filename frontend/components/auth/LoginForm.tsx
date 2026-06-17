'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FormInput from './FormInput';
import { createClient } from '@/lib/supabase/client';
import { getPortalPath } from '@/lib/auth-helpers';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : signInError.message
      );
      setIsLoading(false);
      return;
    }

    // Send the user to their portal based on role (candidate / recruiter)
    const path = await getPortalPath(supabase);
    router.push(path);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Heading */}
      <div className="text-center">
        <h1 className="text-base md:text-lg font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-gray-600 text-[11px] md:text-xs">Access your curated talent dashboard</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2 md:space-y-2.5">
        <FormInput
          label="Email Address"
          icon="mail"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <FormInput
            label="Password"
            icon="lock"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link href="/auth/forgot-password" className="text-[10px] md:text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0">error</span>
            <p className="text-[11px] md:text-xs text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
