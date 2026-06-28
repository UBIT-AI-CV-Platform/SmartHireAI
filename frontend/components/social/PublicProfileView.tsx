'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import FollowButton from './FollowButton'
import FollowListModal from './FollowListModal'
import ReportModal from './ReportModal'
import PostCard from './PostCard'
import ThemeToggle from '@/components/shared/ThemeToggle'
import { displayName, initials, roleLabel, tagline, type Post, type PublicProfile } from '@/lib/social'
import type { MeSnapshot } from './CreatePost'

interface Sections {
  skills: { id: number; name: string }[]
  languages: { id: number; name: string; level: string }[]
  education: { id: number; degree: string; institute: string; start_year: string | null; end_year: string | null }[]
  projects: { id: number; name: string; description: string | null; link: string | null }[]
  certifications: { id: number; name: string; issuer: string | null; issue_date: string | null }[]
  courses: { id: number; name: string; provider: string | null; completion_date: string | null }[]
  awards: { id: number; name: string; issuer: string | null; award_date: string | null }[]
  custom: { id: number; heading: string; items: { title?: string; description?: string }[] }[]
}
const EMPTY: Sections = { skills: [], languages: [], education: [], projects: [], certifications: [], courses: [], awards: [], custom: [] }

export default function PublicProfileView({ username, embedded = false }: { username: string; embedded?: boolean }) {
  const router = useRouter()
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [viewerRole, setViewerRole] = useState<'candidate' | 'recruiter'>('candidate')
  const [me, setMe] = useState<MeSnapshot | null>(null)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [sections, setSections] = useState<Sections>(EMPTY)
  const [posts, setPosts] = useState<Post[]>([])
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set())
  const [isFollowing, setIsFollowing] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [listModal, setListModal] = useState<null | 'followers' | 'following'>(null)
  const [copied, setCopied] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setViewerId(user.id)
        const { data: mine } = await supabase.from('profiles').select('full_name, username, photo_url, role').eq('id', user.id).maybeSingle()
        const role = (mine?.role as 'candidate' | 'recruiter') ?? 'candidate'
        setViewerRole(role)
        setMe({ id: user.id, name: mine?.full_name ?? null, username: mine?.username ?? null, photo: mine?.photo_url ?? null, role })
      }

      const { data: p } = await supabase.from('public_profiles').select('*').ilike('username', username).maybeSingle()
      if (!p) { setNotFound(true); setLoading(false); return }
      setProfile(p as PublicProfile)
      setFollowers(p.followers_count ?? 0)
      setFollowingCount(p.following_count ?? 0)

      const pid = p.id as string
      const [skills, languages, education, projects, certifications, courses, awards, custom, fol, postsRes] = await Promise.all([
        supabase.from('skills').select('id, name').eq('profile_id', pid),
        supabase.from('languages').select('id, name, level').eq('profile_id', pid),
        supabase.from('education').select('id, degree, institute, start_year, end_year').eq('profile_id', pid),
        supabase.from('projects').select('id, name, description, link').eq('profile_id', pid),
        supabase.from('certifications').select('id, name, issuer, issue_date').eq('profile_id', pid),
        supabase.from('courses').select('id, name, provider, completion_date').eq('profile_id', pid),
        supabase.from('awards').select('id, name, issuer, award_date').eq('profile_id', pid),
        supabase.from('custom_sections').select('id, heading, items').eq('profile_id', pid),
        user && user.id !== pid
          ? supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', pid).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('posts').select('*').eq('author_id', pid).order('created_at', { ascending: false }).limit(30),
      ])
      setSections({
        skills: (skills.data ?? []) as Sections['skills'],
        languages: (languages.data ?? []) as Sections['languages'],
        education: (education.data ?? []) as Sections['education'],
        projects: (projects.data ?? []) as Sections['projects'],
        certifications: (certifications.data ?? []) as Sections['certifications'],
        courses: (courses.data ?? []) as Sections['courses'],
        awards: (awards.data ?? []) as Sections['awards'],
        custom: (custom.data ?? []).map((c) => ({ id: c.id as number, heading: c.heading as string, items: Array.isArray(c.items) ? (c.items as { title?: string; description?: string }[]) : [] })),
      })
      setIsFollowing(!!fol.data)
      const postRows = (postsRes.data ?? []) as Post[]
      setPosts(postRows)
      if (user && postRows.length) {
        const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postRows.map((x) => x.id))
        setLikedSet(new Set((likes ?? []).map((l) => l.post_id)))
      }
      setLoading(false)
    })()
  }, [username])

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }
  const startMessage = async () => {
    if (!profile?.id || messaging) return
    setMessaging(true)
    const supabase = createClient()
    const { data: convId } = await supabase.rpc('ensure_dm', { p_other: profile.id as string })
    if (convId) router.push(`${homeHref}/inbox?c=${convId}`); else setMessaging(false)
  }

  const homeHref = viewerRole === 'recruiter' ? '/recruiter' : '/candidate'
  const isOwn = !!profile && viewerId === profile.id
  const hasDetails = sections.skills.length || sections.languages.length || sections.projects.length || sections.education.length || sections.certifications.length || sections.courses.length || sections.awards.length || sections.custom.some((c) => c.items.length)

  return (
    <div className={embedded ? 'text-slate-900 dark:text-slate-100' : 'min-h-screen bg-slate-50 dark:bg-[#0e0e10] text-slate-900 dark:text-slate-100'}>
      {!embedded && (
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 h-14 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span><span className="hidden sm:inline">Back</span>
          </button>
          <Link href={homeHref} className="flex items-center gap-2">
            <div className="w-8 h-8 premium-gradient rounded-lg flex items-center justify-center text-white shadow"><span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span></div>
            <span className="font-black tracking-tight hidden sm:inline">SmartHire AI</span>
          </Link>
          <ThemeToggle />
        </header>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-40 gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        </div>
      ) : notFound || !profile ? (
        <div className="max-w-md mx-auto text-center py-32 px-4">
          <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600">person_off</span>
          <h2 className="text-xl font-bold mt-4">Profile not found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">This handle doesn’t exist or has been removed.</p>
          <Link href={homeHref} className="inline-block mt-5 px-5 py-2.5 rounded-full text-sm font-semibold text-white premium-gradient">Go to dashboard</Link>
        </div>
      ) : (
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          {/* Profile header (no cover) */}
          <section className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 shadow-sm p-5 md:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center overflow-hidden border-4 border-white dark:border-[#1c1c1e] shadow-lg flex-shrink-0">
                {profile.photo_url ? <img src={profile.photo_url} alt={displayName(profile)} className="h-full w-full object-cover" /> : <span className="text-3xl font-black text-indigo-700 dark:text-indigo-300">{initials(profile.full_name)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl md:text-2xl font-black tracking-tight">{displayName(profile)}</h1>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${profile.role === 'recruiter' ? 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300' : 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'}`}>{roleLabel(profile.role)}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{tagline(profile)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">@{profile.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={copyLink} title="Copy link" className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"><span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'link'}</span></button>
                    {!isOwn && <button onClick={() => setShowReport(true)} title="Report" className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"><span className="material-symbols-outlined text-[18px]">flag</span></button>}
                    {isOwn ? (
                      <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white premium-gradient shadow-sm shadow-primary/25"><span className="material-symbols-outlined text-[16px]">edit</span> Edit profile</button>
                    ) : (
                      <>
                        <button onClick={startMessage} disabled={messaging} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-60"><span className="material-symbols-outlined text-[16px]">chat</span>{messaging ? 'Opening…' : 'Message'}</button>
                        <FollowButton targetId={profile.id as string} initialFollowing={isFollowing} onChange={(now) => { setIsFollowing(now); setFollowers((c) => c + (now ? 1 : -1)) }} />
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-sm">
                  <button onClick={() => setListModal('followers')} className="hover:underline"><span className="font-bold">{followers}</span> <span className="text-slate-500 dark:text-slate-400">followers</span></button>
                  <button onClick={() => setListModal('following')} className="hover:underline"><span className="font-bold">{followingCount}</span> <span className="text-slate-500 dark:text-slate-400">following</span></button>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  {profile.location && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">location_on</span>{profile.location}</span>}
                  {profile.role === 'recruiter' && profile.company_name && <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-[15px]">apartment</span>{profile.company_name}</span>}
                  {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary"><span className="material-symbols-outlined text-[15px]">link</span>LinkedIn</a>}
                  {profile.github_url && <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-primary"><span className="material-symbols-outlined text-[15px]">link</span>GitHub</a>}
                </div>

                {(profile.summary || profile.company_about) && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-line leading-relaxed">{profile.summary || profile.company_about}</p>
                )}
              </div>
            </div>
          </section>

          {/* 60/40: posts left, details right */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-5">
            {/* LEFT 60% — posts */}
            <div className="lg:col-span-3 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400 px-1">{isOwn ? 'Your posts' : 'Posts'}</h2>
              {posts.length === 0 ? (
                <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 p-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">dynamic_feed</span>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{isOwn ? 'You haven’t posted yet.' : 'No posts yet.'}</p>
                </div>
              ) : posts.map((p) => (
                <PostCard key={p.id} post={p} me={me} initialLiked={likedSet.has(p.id)} onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))} />
              ))}
            </div>

            {/* RIGHT 40% — details (recruiters: a Company card they can actually edit;
                candidates: profile sections from Build Profile) */}
            <div className="lg:col-span-2 space-y-4">
              {profile.role === 'recruiter' ? (
                <Card title="Company" icon="apartment">
                  {(profile.company_name || profile.company_industry || profile.company_about || profile.company_website || profile.company_size) ? (
                    <div className="space-y-2 text-sm">
                      {profile.company_name && <p className="font-bold text-slate-900 dark:text-slate-100">{profile.company_name}</p>}
                      {(profile.company_industry || profile.company_size) && <p className="text-slate-500 dark:text-slate-400">{[profile.company_industry, profile.company_size].filter(Boolean).join(' · ')}</p>}
                      {profile.company_website && <a href={profile.company_website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><span className="material-symbols-outlined text-[15px]">link</span>Website</a>}
                      {profile.company_about && <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line pt-1">{profile.company_about}</p>}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">{isOwn ? 'Add your company details from the Company page.' : 'No company details yet.'}</p>
                  )}
                </Card>
              ) : (
                <>
              {!hasDetails && <div className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 p-6 text-center text-sm text-slate-400">No details added yet.</div>}
              {sections.skills.length > 0 && <Card title="Skills" icon="bolt"><div className="flex flex-wrap gap-2">{sections.skills.map((s) => <span key={s.id} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">{s.name}</span>)}</div></Card>}
              {sections.languages.length > 0 && <Card title="Languages" icon="translate"><div className="flex flex-wrap gap-2">{sections.languages.map((l) => <span key={l.id} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">{l.name}{l.level ? ` · ${l.level}` : ''}</span>)}</div></Card>}
              {sections.projects.length > 0 && <Card title="Projects" icon="rocket_launch"><div className="space-y-4">{sections.projects.map((p) => (<div key={p.id} className="border-l-2 border-primary/30 pl-4"><div className="flex items-center gap-2"><h4 className="font-bold text-sm">{p.name}</h4>{p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-primary"><span className="material-symbols-outlined text-[15px]">open_in_new</span></a>}</div>{p.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{p.description}</p>}</div>))}</div></Card>}
              {sections.education.length > 0 && <Card title="Education" icon="school"><div className="space-y-4">{sections.education.map((e) => (<div key={e.id} className="border-l-2 border-primary/30 pl-4"><h4 className="font-bold text-sm">{e.degree}</h4><p className="text-sm text-slate-600 dark:text-slate-300">{e.institute}</p>{(e.start_year || e.end_year) && <p className="text-xs text-slate-400 mt-0.5">{[e.start_year, e.end_year].filter(Boolean).join(' – ')}</p>}</div>))}</div></Card>}
              {sections.certifications.length > 0 && <Card title="Certifications" icon="verified"><ListItems items={sections.certifications.map((c) => ({ id: c.id, primary: c.name, secondary: [c.issuer, c.issue_date].filter(Boolean).join(' · ') }))} /></Card>}
              {sections.courses.length > 0 && <Card title="Courses" icon="menu_book"><ListItems items={sections.courses.map((c) => ({ id: c.id, primary: c.name, secondary: [c.provider, c.completion_date].filter(Boolean).join(' · ') }))} /></Card>}
              {sections.awards.length > 0 && <Card title="Awards" icon="emoji_events"><ListItems items={sections.awards.map((a) => ({ id: a.id, primary: a.name, secondary: [a.issuer, a.award_date].filter(Boolean).join(' · ') }))} /></Card>}
              {sections.custom.map((cs) => cs.items.length > 0 && (<Card key={cs.id} title={cs.heading} icon="bookmark"><div className="space-y-3">{cs.items.map((it, i) => (<div key={i} className="border-l-2 border-primary/30 pl-4">{it.title && <h4 className="font-bold text-sm">{it.title}</h4>}{it.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{it.description}</p>}</div>))}</div></Card>))}
                </>
              )}
            </div>
          </div>
        </main>
      )}

      {profile && listModal && <FollowListModal open onClose={() => setListModal(null)} profileId={profile.id as string} mode={listModal} viewerId={viewerId} />}
      {profile && showReport && <ReportModal targetType="profile" targetId={profile.id as string} targetLabel={displayName(profile)} onClose={() => setShowReport(false)} />}
      {profile && showEdit && isOwn && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(patch) => setProfile((cur) => (cur ? { ...cur, ...patch } : cur))}
        />
      )}
    </div>
  )
}

function EditProfileModal({ profile, onClose, onSaved }: { profile: PublicProfile; onClose: () => void; onSaved: (patch: Partial<PublicProfile>) => void }) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [headline, setHeadline] = useState(profile.headline ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [bio, setBio] = useState(profile.summary ?? '')
  const [photo, setPhoto] = useState(profile.photo_url ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setBusy(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/avatar-${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, f, { upsert: true })
    if (upErr) { setError(upErr.message); setBusy(false); return }
    setPhoto(supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl)
    setBusy(false)
  }

  const save = async () => {
    setBusy(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const patch = { full_name: fullName.trim() || null, headline: headline.trim() || null, location: location.trim() || null, summary: bio.trim() || null, photo_url: photo || null }
    const { error: err } = await supabase.from('profiles').update(patch).eq('id', user.id)
    setBusy(false)
    if (err) { setError(err.message); return }
    onSaved(patch)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl border border-slate-200/70 dark:border-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10 sticky top-0 bg-white dark:bg-[#1c1c1e]">
          <h3 className="font-bold">Edit profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center overflow-hidden flex-shrink-0">
              {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">{initials(fullName)}</span>}
            </div>
            <label className="px-3.5 py-2 rounded-full text-sm font-semibold border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer">
              Change photo
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
            </label>
          </div>
          <Field label="Name" value={fullName} onChange={setFullName} />
          <Field label="Headline" value={headline} onChange={setHeadline} placeholder="e.g. Frontend Developer | React & Next.js" />
          <Field label="Location" value={location} onChange={setLocation} placeholder="e.g. Karachi, Pakistan" />
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell people about yourself…" className="w-full resize-none px-4 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={save} disabled={busy} className="w-full py-2.5 rounded-full text-sm font-semibold text-white premium-gradient disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-[#1c1c1e] rounded-3xl border border-slate-200/70 dark:border-white/10 p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold mb-4"><span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>{title}</h3>
      {children}
    </section>
  )
}

function ListItems({ items }: { items: { id: number; primary: string; secondary: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="border-l-2 border-primary/30 pl-4">
          <h4 className="font-bold text-sm">{it.primary}</h4>
          {it.secondary && <p className="text-xs text-slate-400 mt-0.5">{it.secondary}</p>}
        </div>
      ))}
    </div>
  )
}
