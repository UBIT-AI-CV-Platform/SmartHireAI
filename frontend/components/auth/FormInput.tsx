'use client';

import { useState } from 'react';

interface FormInputProps {
  label: string;
  icon: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export default function FormInput({
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] md:text-xs font-bold text-gray-900 uppercase tracking-wider block">
        {label}
      </label>
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-xl">
          {icon}
        </span>
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full pl-12 ${isPassword ? 'pr-12' : 'pr-4'} py-2.5 md:py-3 bg-white/70 border border-indigo-200/40 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-white transition-all outline-none text-sm md:text-base placeholder:text-gray-400 text-gray-900`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors p-0.5"
          >
            <span className="material-symbols-outlined text-xl">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
