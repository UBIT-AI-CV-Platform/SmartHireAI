'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initials, type Post } from '@/lib/social'

export interface MeSnapshot {
  id: string
  name: string | null
  username: string | null
  photo: string | null
  role: 'candidate' | 'recruiter'
}

/** Compact "start a post" trigger that opens the composer popup. */
export default function CreatePost({ me, onCreated }: { me: MeSnapshot; onCreated: (post: Post) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 p-3 md:p-4 shadow-sm flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0 border border-white dark:border-white/10">
          {me.photo ? <img src={me.photo} alt="You" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(me.name)}</span>}
        </div>
        <button onClick={() => setOpen(true)} className="flex-1 text-left px-4 py-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors">
          Share an update, a win, or what you&apos;re working on…
        </button>
        <button onClick={() => setOpen(true)} className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient shadow-sm shadow-primary/25">
          <span className="material-symbols-outlined text-[18px]">edit_square</span> Post
        </button>
      </div>
      {open && <PostComposerModal me={me} onClose={() => setOpen(false)} onCreated={onCreated} />}
    </>
  )
}

function PostComposerModal({ me, onClose, onCreated }: { me: MeSnapshot; onClose: () => void; onCreated: (post: Post) => void }) {
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [doc, setDoc] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  // wrap the current textarea selection with a markdown marker (e.g. ** or *)
  const wrap = (mark: string) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const sel = content.slice(start, end) || 'text'
    const next = content.slice(0, start) + mark + sel + mark + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + mark.length, start + mark.length + sel.length) })
  }

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setError(''); setImage(f); setImagePreview(URL.createObjectURL(f))
  }
  const pickDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 15 * 1024 * 1024) { setError('File must be under 15 MB.'); return }
    setError(''); setDoc(f)
  }

  const submit = async () => {
    if (posting || (!content.trim() && !image && !doc)) return
    setPosting(true); setError('')
    const supabase = createClient()
    try {
      let imageUrl: string | null = null
      let fileUrl: string | null = null
      let fileName: string | null = null
      if (image) {
        const ext = (image.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`
        const { error: e1 } = await supabase.storage.from('post-media').upload(path, image)
        if (e1) throw e1
        imageUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl
      }
      if (doc) {
        const ext = (doc.name.split('.').pop() || 'pdf').toLowerCase()
        const path = `${me.id}/${crypto.randomUUID()}.${ext}`
        const { error: e2 } = await supabase.storage.from('post-media').upload(path, doc)
        if (e2) throw e2
        fileUrl = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl
        fileName = doc.name
      }
      const { data, error: e3 } = await supabase
        .from('posts')
        .insert({
          author_id: me.id, author_name: me.name, author_username: me.username, author_photo: me.photo, author_role: me.role,
          content: content.trim() || null, image_url: imageUrl, file_url: fileUrl, file_name: fileName,
        })
        .select('*').single()
      if (e3) throw e3
      onCreated(data as Post)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish your post.')
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Create a post</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
              {me.photo ? <img src={me.photo} alt="You" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{initials(me.name)}</span>}
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{me.name || 'You'}</p>
          </div>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 mb-2">
            <button onClick={() => wrap('**')} title="Bold" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">B</button>
            <button onClick={() => wrap('*')} title="Italic" className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center italic">i</button>
            <span className="text-[11px] text-slate-400 ml-1">Select text, then Bold/Italic</span>
          </div>

          <textarea
            ref={taRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to talk about?"
            rows={5}
            className="w-full resize-none bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />

          {imagePreview && (
            <div className="relative mt-2 rounded-2xl overflow-hidden border border-slate-200/70 dark:border-white/10">
              <img src={imagePreview} alt="preview" className="w-full max-h-72 object-cover" />
              <button onClick={() => { setImage(null); setImagePreview(''); if (imgRef.current) imgRef.current.value = '' }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-slate-900/60 text-white flex items-center justify-center hover:bg-slate-900/80"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>
          )}
          {doc && (
            <div className="mt-2 flex items-center gap-2 p-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <span className="material-symbols-outlined text-primary">description</span>
              <span className="text-sm text-slate-700 dark:text-slate-200 truncate flex-1">{doc.name}</span>
              <button onClick={() => { setDoc(null); if (docRef.current) docRef.current.value = '' }} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>
          )}

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1">
              <button onClick={() => imgRef.current?.click()} title="Add photo" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px] text-green-600 dark:text-green-400">image</span><span className="hidden sm:inline">Photo</span>
              </button>
              <button onClick={() => docRef.current?.click()} title="Add document" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px] text-amber-600 dark:text-amber-400">attach_file</span><span className="hidden sm:inline">Document</span>
              </button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={pickImage} />
              <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv" className="hidden" onChange={pickDoc} />
            </div>
            <button onClick={submit} disabled={posting || (!content.trim() && !image && !doc)} className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient shadow-sm shadow-primary/25 disabled:opacity-50 transition-opacity">
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
