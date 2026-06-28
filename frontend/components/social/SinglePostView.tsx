'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PostCard from './PostCard'
import ThemeToggle from '@/components/shared/ThemeToggle'
import type { MeSnapshot } from './CreatePost'
import type { Post } from '@/lib/social'

export default function SinglePostView({ postId }: { postId: string }) {
  const router = useRouter()
  const [me, setMe] = useState<MeSnapshot | null>(null)
  const [post, setPost] = useState<Post | null>(null)
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [homeHref, setHomeHref] = useState('/candidate')

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('full_name, username, photo_url, role').eq('id', user.id).maybeSingle()
        const role = (prof?.role as 'candidate' | 'recruiter') ?? 'candidate'
        setMe({ id: user.id, name: prof?.full_name ?? null, username: prof?.username ?? null, photo: prof?.photo_url ?? null, role })
        setHomeHref(role === 'recruiter' ? '/recruiter' : '/candidate')
      }

      const { data: p } = await supabase.from('posts').select('*').eq('id', postId).maybeSingle()
      if (!p) { setNotFound(true); setLoading(false); return }
      setPost(p as Post)

      if (user) {
        const { data: l } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).eq('post_id', postId).maybeSingle()
        setLiked(!!l)
      }
      setLoading(false)
    })()
  }, [postId])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0e0e10] text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-14 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="hidden sm:inline">Back</span>
        </button>
        <Link href={homeHref} className="flex items-center gap-2">
          <div className="w-8 h-8 premium-gradient rounded-lg flex items-center justify-center text-white shadow">
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          </div>
          <span className="font-black tracking-tight hidden sm:inline">SmartHire AI</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-32 gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          </div>
        ) : notFound || !post ? (
          <div className="text-center py-28">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">feed</span>
            <h2 className="text-xl font-bold mt-4">Post not found</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">It may have been deleted.</p>
            <Link href={homeHref} className="inline-block mt-5 px-5 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient">Go to dashboard</Link>
          </div>
        ) : (
          <PostCard post={post} me={me} initialLiked={liked} defaultExpanded onDeleted={() => router.push(homeHref)} />
        )}
      </main>
    </div>
  )
}
