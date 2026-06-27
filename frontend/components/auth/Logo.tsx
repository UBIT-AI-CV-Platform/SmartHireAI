export default function Logo() {
  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#3525cd] to-[#712ae2] rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-lg">
          <span
            className="material-symbols-outlined text-2xl md:text-3xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            auto_awesome
          </span>
        </div>
        <div className="flex text-2xl md:text-3xl font-bold tracking-tight">
          <span className="text-gray-900 dark:text-slate-100">SmartHire</span>
          <span className="text-primary ml-0.5">AI</span>
        </div>
      </div>
    </div>
  );
}
