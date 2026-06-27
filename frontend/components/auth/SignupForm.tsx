'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FormInput from './FormInput';
import { createClient } from '@/lib/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import LegalLink from '@/components/shared/LegalModal';

export default function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');

  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Strong-password conditions
  const conditions = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const allConditionsMet = Object.values(conditions).every(Boolean);

  const redirectToPortal = () => {
    router.push(role === 'recruiter' ? '/recruiter' : '/candidate');
    router.refresh();
  };

  // Step 1 — create the account; Supabase emails a 6-digit OTP
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    // Empty identities => email already registered (one email = one account/role)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('An account with this email already exists. Please log in instead.');
      setIsLoading(false);
      return;
    }

    // Email confirmation OFF -> session ready, go straight in
    if (data.session) {
      redirectToPortal();
      return;
    }

    // Email confirmation ON -> move to the OTP step
    setStep('otp');
    setInfo(`We've sent a verification code to ${email}. Enter it below to verify.`);
    setIsLoading(false);
  };

  // Step 2 — verify the OTP from the email
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    if (verifyError) {
      setError(
        verifyError.message.toLowerCase().includes('expired')
          ? 'This code has expired. Tap "Resend code" to get a new one.'
          : 'Invalid code. Please try again.'
      );
      setIsLoading(false);
      return;
    }

    if (data.session) {
      redirectToPortal();
      return;
    }
    setIsLoading(false);
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    if (resendError) setError(resendError.message);
    else setInfo('A new code has been sent. Please check your email.');
  };

  // ── OTP verification view ──────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="flex flex-col gap-4 auth-fade-up">
        <div className="text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center auth-pop">
            <span className="material-symbols-outlined text-primary text-2xl">mark_email_unread</span>
          </div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Verify your email</h1>
          <p className="text-gray-600 dark:text-slate-300 text-[11px] md:text-xs">
            Enter the code sent to <span className="font-semibold text-gray-800 dark:text-slate-200">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col items-center gap-4">
          <InputOTP maxLength={8} value={otp} onChange={setOtp} containerClassName="gap-1">
            <InputOTPGroup className="gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-11 w-9 rounded-xl border text-base font-bold bg-white/70 dark:bg-white/5 border-indigo-200/50 dark:border-white/10 dark:text-slate-100 data-[active=true]:border-primary data-[active=true]:ring-primary/30"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <div className="w-full flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 px-3 py-2">
              <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0">error</span>
              <p className="text-[11px] md:text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}
          {info && !error && (
            <div className="w-full flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-500/15 border border-green-200 dark:border-green-500/20 px-3 py-2">
              <span className="material-symbols-outlined text-green-600 text-base flex-shrink-0">mark_email_read</span>
              <p className="text-[11px] md:text-xs text-green-700 dark:text-green-300 font-medium">{info}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.length < 8}
            className="w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'Verify & Continue'}
          </button>

          <div className="flex items-center gap-3 text-[11px] md:text-xs">
            <button type="button" onClick={handleResend} className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Resend code
            </button>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => { setStep('form'); setOtp(''); setError(null); setInfo(null); }}
              className="font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
            >
              Change email
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Signup form view ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="text-center">
        <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Create Account</h1>
        <p className="text-gray-600 dark:text-slate-300 text-[11px] md:text-xs">Join the network of elite tech talent</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-2 md:space-y-2.5">
        {/* Role Selection */}
        <div>
          <label className="block text-[10px] md:text-xs font-bold text-gray-900 dark:text-slate-100 mb-1.5 uppercase tracking-wider">
            I am a
          </label>
          <div className="grid grid-cols-2 gap-2 md:gap-2.5">
            <RoleOption label="Candidate" icon="person" value="candidate" isSelected={role === 'candidate'} onChange={() => setRole('candidate')} />
            <RoleOption label="Recruiter / HR" icon="badge" value="recruiter" isSelected={role === 'recruiter'} onChange={() => setRole('recruiter')} />
          </div>
        </div>

        <FormInput label="Full Name" icon="person" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <FormInput label="Email Address" icon="mail" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />

        {/* Password Field */}
        <div>
          <FormInput label="Password" icon="lock" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {password.length > 0 && (
            <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
              <PasswordCondition met={conditions.hasMinLength} text="8+ characters" />
              <PasswordCondition met={conditions.hasUpperCase} text="Uppercase" />
              <PasswordCondition met={conditions.hasLowerCase} text="Lowercase" />
              <PasswordCondition met={conditions.hasNumber} text="Number" />
              <PasswordCondition met={conditions.hasSpecialChar} text="Special char" />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/20 px-3 py-2">
            <span className="material-symbols-outlined text-red-500 text-base flex-shrink-0">error</span>
            <p className="text-[11px] md:text-xs text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !allConditionsMet || !fullName || !email}
          className="w-full bg-gradient-to-r from-[#3525cd] to-[#712ae2] text-white py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-lg hover:shadow-xl hover:shadow-indigo-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="text-center text-[10px] md:text-[11px] text-gray-600 dark:text-slate-400">
          By signing up, you agree to our{' '}
          <LegalLink kind="terms" className="text-primary font-semibold hover:text-primary/80 transition-colors cursor-pointer">Terms of Service</LegalLink>
        </p>
      </form>
    </div>
  );
}

interface RoleOptionProps {
  label: string;
  icon: string;
  value: string;
  isSelected: boolean;
  onChange: () => void;
}

function RoleOption({ label, icon, value, isSelected, onChange }: RoleOptionProps) {
  return (
    <label className="relative cursor-pointer">
      <input type="radio" name="role" value={value} checked={isSelected} onChange={onChange} className="sr-only" />
      <div
        className={`p-2.5 md:p-3 rounded-lg border-2 transition-all duration-300 flex flex-col items-center text-center gap-1.5 ${
          isSelected ? 'border-indigo-300 bg-indigo-100/60 dark:bg-indigo-500/15 scale-[1.02]' : 'border-indigo-200/40 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10'
        }`}
      >
        <span className={`material-symbols-outlined text-lg md:text-2xl transition-colors ${isSelected ? 'text-primary' : 'text-gray-600 dark:text-slate-400'}`}>
          {icon}
        </span>
        <span className="text-[8px] md:text-[9px] font-bold text-gray-900 dark:text-slate-100 uppercase tracking-tighter">{label}</span>
      </div>
    </label>
  );
}

interface PasswordConditionProps {
  met: boolean;
  text: string;
}

function PasswordCondition({ met, text }: PasswordConditionProps) {
  return (
    <div className="flex items-center gap-1">
      <span className={`material-symbols-outlined text-[14px] transition-colors duration-300 flex-shrink-0 ${met ? 'text-green-500' : 'text-red-500'}`}>
        {met ? 'check_circle' : 'cancel'}
      </span>
      <span className={`text-[10px] md:text-[11px] transition-colors duration-300 ${met ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
        {text}
      </span>
    </div>
  );
}
