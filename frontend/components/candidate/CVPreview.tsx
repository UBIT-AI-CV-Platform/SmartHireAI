// Read-only render of a generated CV's JSON content (used in the apply CV-picker).

export type CVContent = {
  full_name?: string
  title?: string
  contact?: { email?: string; phone?: string; location?: string }
  summary?: string
  experience?: { role: string; organization: string; period: string; bullets: string[] }[]
  education?: { degree: string; institute: string; period: string }[]
  skills?: string[]
  certifications?: { name: string; issuer?: string; date?: string }[]
  courses?: { name: string; provider?: string; date?: string }[]
  awards?: { name: string; issuer?: string; date?: string }[]
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary mb-2">{title}</h4>
      {children}
    </div>
  )
}

const credLine = (c: { name: string; issuer?: string; provider?: string; date?: string }, i: number) => {
  const sub = [c.issuer || c.provider, c.date].filter(Boolean).join(' • ')
  return (
    <li key={i} className="text-sm text-on-surface">
      <span className="font-bold">{c.name}</span>
      {sub ? <span className="text-on-surface-variant"> — {sub}</span> : null}
    </li>
  )
}

export default function CVPreview({ cv }: { cv: CVContent | null }) {
  if (!cv) return <p className="text-sm text-on-surface-variant text-center py-8">This CV has no saved content.</p>
  return (
    <div className="bg-white rounded-2xl border border-surface-container p-6 shadow-sm">
      <h2 className="text-2xl font-black text-on-surface tracking-tight">{cv.full_name}</h2>
      {cv.title && <p className="text-base font-semibold text-primary mb-2">{cv.title}</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant mb-5">
        {cv.contact?.email && <span>{cv.contact.email}</span>}
        {cv.contact?.phone && <span>{cv.contact.phone}</span>}
        {cv.contact?.location && <span>{cv.contact.location}</span>}
      </div>

      {cv.summary && <Block title="Summary"><p className="text-sm text-on-surface leading-relaxed">{cv.summary}</p></Block>}

      {cv.experience && cv.experience.length > 0 && (
        <Block title="Experience">
          <div className="space-y-3">
            {cv.experience.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline gap-2">
                  <p className="text-sm font-bold text-on-surface">{e.role}</p>
                  {e.period && <span className="text-xs text-outline font-semibold">{e.period}</span>}
                </div>
                {e.organization && <p className="text-xs font-semibold text-primary">{e.organization}</p>}
                <ul className="list-disc list-inside text-sm text-on-surface-variant mt-1 space-y-0.5">
                  {e.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.education && cv.education.length > 0 && (
        <Block title="Education">
          <div className="space-y-2">
            {cv.education.map((e, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <div>
                  <p className="text-sm font-bold text-on-surface">{e.degree}</p>
                  <p className="text-xs text-on-surface-variant">{e.institute}</p>
                </div>
                {e.period && <span className="text-xs text-outline font-semibold">{e.period}</span>}
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.skills && cv.skills.length > 0 && (
        <Block title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((s, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{s}</span>)}
          </div>
        </Block>
      )}

      {cv.certifications && cv.certifications.length > 0 && <Block title="Certifications"><ul className="space-y-1">{cv.certifications.map(credLine)}</ul></Block>}
      {cv.courses && cv.courses.length > 0 && <Block title="Courses"><ul className="space-y-1">{cv.courses.map(credLine)}</ul></Block>}
      {cv.awards && cv.awards.length > 0 && <Block title="Awards"><ul className="space-y-1">{cv.awards.map(credLine)}</ul></Block>}
    </div>
  )
}
