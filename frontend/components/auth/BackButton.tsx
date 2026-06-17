export default function BackButton() {
  return (
    <a
      href="/"
      className="fixed top-4 left-4 md:top-6 md:left-6 lg:top-8 lg:left-8 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-white/70 text-gray-700 hover:bg-white hover:text-primary transition-all duration-300 shadow-lg group"
      aria-label="Go back"
    >
      <span className="material-symbols-outlined text-xl transition-transform duration-300 group-hover:-translate-x-0.5">
        west
      </span>
    </a>
  );
}
