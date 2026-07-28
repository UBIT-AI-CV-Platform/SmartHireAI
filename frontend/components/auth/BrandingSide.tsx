'use client';

import { Icon } from '@/components/ui/icon';
import BrandLogo from '@/components/shared/BrandLogo';

export default function BrandingSide() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 md:p-8 lg:p-12 text-center overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 dark:from-[#1c1c1e] dark:via-[#241d36] dark:to-[#1c1c1e]">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="auth-blob absolute top-0 left-0 w-96 h-96 bg-indigo-300/25 rounded-full blur-3xl" />
        <div className="auth-blob absolute bottom-0 right-0 w-96 h-96 bg-purple-300/25 rounded-full blur-3xl" style={{ animationDelay: '-8s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-xs md:max-w-sm lg:max-w-md">
        {/* Logo */}
        <div className="mb-6 auth-pop">
          <BrandLogo size={44} />
        </div>

        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 leading-tight auth-fade-up" style={{ animationDelay: '0.1s' }}>
          Welcome to Your Career
        </h1>

        {/* Description */}
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 mb-6 leading-relaxed auth-fade-up" style={{ animationDelay: '0.2s' }}>
          Connect with top companies or build your team of elite talent.
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <FeatureBox icon="verified" title="AI Powered" description="Smart Matching" bgColor="bg-pink-100/60 dark:bg-pink-500/15" iconColor="text-pink-600 dark:text-pink-300" delay="0.3s" />
          <FeatureBox icon="security" title="Secured" description="Verified Users" bgColor="bg-blue-100/60 dark:bg-sky-500/15" iconColor="text-blue-600 dark:text-sky-300" delay="0.42s" />
          <FeatureBox icon="flash_on" title="Lightning Fast" description="Quick Process" bgColor="bg-amber-100/60 dark:bg-amber-500/15" iconColor="text-amber-600 dark:text-amber-300" delay="0.54s" />
        </div>
      </div>
    </div>
  );
}

interface FeatureBoxProps {
  icon: string;
  title: string;
  description: string;
  bgColor: string;
  iconColor: string;
  delay?: string;
}

function FeatureBox({ icon, title, description, bgColor, iconColor, delay }: FeatureBoxProps) {
  return (
    <div
      style={{ animationDelay: delay }}
      className={`auth-pop flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl ${bgColor} border border-indigo-200/40 dark:border-white/10 transition-all duration-300 hover:shadow-md hover:-translate-y-1 group cursor-pointer`}
    >
      <Icon name={icon} className={`text-2xl md:text-3xl ${iconColor} transition-transform duration-300 group-hover:scale-125`} />
      <p className="text-xs md:text-sm font-bold text-slate-900 dark:text-slate-100 text-center">{title}</p>
      <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-300 text-center">{description}</p>
    </div>
  );
}
