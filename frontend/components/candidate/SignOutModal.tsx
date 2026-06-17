'use client'

interface SignOutModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  loading?: boolean
}

export default function SignOutModal({ open, onCancel, onConfirm, loading }: SignOutModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 text-center auth-pop">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-red-500 text-3xl">logout</span>
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-1">Sign out?</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          Are you sure you want to log out of your account?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-on-surface font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
