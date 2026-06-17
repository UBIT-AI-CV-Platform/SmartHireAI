export default function Footer() {
  return (
    <footer className="pt-12 pb-6 px-6 overflow-hidden relative text-slate-900 bg-indigo-50/50">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 mb-8 items-start">
          {/* Logo Section */}
          <div className="lg:col-span-4">
            <div className="text-lg sm:text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-3 sm:mb-4 tracking-tight">
              SmartHire AI
            </div>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 max-w-sm">
              Empowering the modern workforce with editorial intelligence. We bridge the gap between
              top-tier talent and forward-thinking companies.
            </p>
            <div className="flex gap-4">
              <a
                href="https://mail.google.com/mail/u/0/?fs=1&to=shanza.iftikhar12@gmail.com&su=Hello%20SmartHire%20AI"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:border-indigo-500/50 transition-all text-slate-300 hover:text-indigo-400"
                title="Email Support"
              >
                <span className="material-symbols-outlined text-xl">mail</span>
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div className="lg:col-span-2 flex flex-col h-full justify-center">
            <h4 className="font-bold mb-2 sm:mb-3 text-[10px] sm:text-xs uppercase tracking-widest text-slate-900">
              Platform
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs md:text-sm font-medium text-slate-400">
              <li>
                <a className="hover:text-indigo-400" href="#features" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Features
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-400" href="#how-it-works" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  How It Works
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-400" href="/auth">
                  For Candidates
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-400" href="/auth">
                  For Recruiters
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-400" href="#faq" onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="lg:col-span-2 flex flex-col h-full justify-center">
            <h4 className="font-bold mb-2 sm:mb-3 text-[10px] sm:text-xs uppercase tracking-widest text-slate-900">
              Company
            </h4>
            <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs md:text-sm font-medium text-slate-400">
              <li>
                <a className="hover:text-indigo-400" href="#">
                  About Us
                </a>
              </li>
              <li>
                <a 
                  href="https://mail.google.com/mail/u/0/?fs=1&to=shanza.iftikhar12@gmail.com&su=Hello%20SmartHire%20AI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400"
                >
                  Email Support
                </a>
              </li>
              <li>
                <a className="hover:text-indigo-400" href="#">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="lg:col-span-4 flex flex-col items-start lg:items-end h-full justify-center">
            <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-xs items-end justify-center">
              <a href="/auth" className="premium-gradient text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm shadow-xl border-2 border-transparent transition-all hover:bg-none hover:bg-[#6366f1] hover:border-[#6366f1] hover:-translate-y-1 text-center w-full block">
                Sign Up Free
              </a>
              <a href="/auth" className="bg-slate-900 border border-slate-800 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-800 text-center w-full block">
                Login
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-3 sm:pt-4 border-t text-center md:text-left border-slate-200">
          <div className="text-slate-500 text-[9px] sm:text-[10px] md:text-xs font-medium tracking-wide">
            © 2024 SmartHire AI. Editorial Intelligence for Modern Teams.
          </div>
        </div>
      </div>
    </footer>
  )
}
