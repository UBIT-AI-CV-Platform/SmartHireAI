export default function Separator() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-center relative">
      <div className="w-full max-w-lg relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent blur-xl h-4 w-full"></div>
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
        <div className="absolute h-px w-32 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_12px_rgba(168,85,247,0.5)]"></div>
        <div className="absolute flex items-center justify-center bg-white dark:bg-[#2c2c2e] p-1.5 rounded-full border border-indigo-100 dark:border-white/10 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
