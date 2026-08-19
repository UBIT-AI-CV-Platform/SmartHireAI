// Read-only render of a generated CV's JSON content (used in the apply CV-picker).

export type CVContent = {
  full_name?: string
  title?: string
  contact?: { email?: string; phone?: string; location?: string }
  summary?: string
  experience?: { role: string; organization: string; period: string; bullets: string[]; link?: string }[]
  education?: { degree: string; institute: string; period: string }[]
  skills?: string[]
  certifications?: { name: string; issuer?: string; date?: string; link?: string }[]
  courses?: { name: string; provider?: string; date?: string; link?: string }[]
  awards?: { name: string; issuer?: string; date?: string; link?: string }[]
  projects?: { name: string; description?: string; date?: string; link?: string; links?: { label: string; url: string }[] }[]
  custom_sections?: { heading: string; items: { title: string; description?: string; link?: string }[] }[]
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-primary mb-2">{title}</h4>
      {children}
    </div>
  )
}

const normalizeUrl = (value: string) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)

const LinkLine = ({ value }: { value: string }) => (
  <a href={normalizeUrl(value)} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline break-all mt-0.5">{value}</a>
)

const LinkedTitle = ({ value, link }: { value: string; link?: string }) => (
  link
    ? <a href={normalizeUrl(link)} target="_blank" rel="noopener noreferrer" title={`Open ${value}`} className="font-bold text-primary hover:underline underline-offset-2">{value}</a>
    : <span className="font-bold">{value}</span>
)

// Project names stay plain text when the clickable labels (GitHub / Live Demo)
// are already rendered beside them, so a heading is never a duplicate link.
const ProjectTitle = ({ value, link, links, className = 'font-bold' }: { value: string; link?: string; links?: { label: string; url: string }[]; className?: string }) => (
  links && links.length > 0
    ? <span className={className}>{value}</span>
    : <LinkedTitle value={value} link={link} />
)

const ProjectLinks = ({ links, inline = false }: { links?: { label: string; url: string }[]; inline?: boolean }) => {
  const unique = (links ?? []).filter((link, index, all) => link.url && all.findIndex((item) => item.url === link.url) === index)
  if (!unique.length) return null
  return <div className={`${inline ? '' : 'mt-1'} flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold`}>{unique.map((link, index) => <span key={link.url} className="inline-flex items-center gap-3"><a href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link.label || 'Open link'}</a>{index < unique.length - 1 && <span className="text-outline">|</span>}</span>)}</div>
}

const credLine = (c: { name: string; issuer?: string; provider?: string; date?: string; link?: string }, i: number) => {
  const sub = [c.issuer || c.provider, c.date].filter(Boolean).join(' • ')
  return (
    <li key={i} className="text-sm text-on-surface">
      <LinkedTitle value={c.name} link={c.link} />
      {sub ? <span className="text-on-surface-variant"> - {sub}</span> : null}
    </li>
  )
}

export default function CVPreview({ cv }: { cv: CVContent | null }) {
  if (!cv) return <p className="text-sm text-on-surface-variant text-center py-8">This CV has no saved content.</p>
  return (
    <div className="cv-paper bg-white rounded-2xl border border-surface-container p-6 shadow-sm">
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
                  <p className="text-sm font-bold text-on-surface"><LinkedTitle value={e.role} link={e.link} /></p>
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
            {cv.skills.map((s, i) => <span key={`${s}-${i}`} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">{s}</span>)}
          </div>
        </Block>
      )}

      {cv.certifications && cv.certifications.length > 0 && <Block title="Certifications"><ul className="space-y-1">{cv.certifications.map(credLine)}</ul></Block>}
      {cv.courses && cv.courses.length > 0 && <Block title="Courses"><ul className="space-y-1">{cv.courses.map(credLine)}</ul></Block>}
      {cv.awards && cv.awards.length > 0 && <Block title="Awards"><ul className="space-y-1">{cv.awards.map(credLine)}</ul></Block>}
      {cv.projects && cv.projects.length > 0 && (
        <Block title="Projects">
          <div className="space-y-2">
            {cv.projects.map((project, i) => <div key={`${project.name}-${i}`}><div className="flex justify-between items-baseline gap-2"><p className="text-sm text-on-surface"><ProjectTitle value={project.name} link={project.link} links={project.links} /></p><div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1">{project.date && <span className="text-xs text-outline font-semibold">{project.date}</span>}<ProjectLinks links={project.links} inline /></div></div>{project.description && <p className="text-sm text-on-surface-variant">{project.description}</p>}</div>)}
          </div>
        </Block>
      )}

      {(cv.custom_sections ?? []).filter((s) => s.heading && s.items?.length).map((s, si) => (
        <Block key={si} title={s.heading}>
          <div className="space-y-2">
            {s.items.map((it, ii) => (
              <div key={ii}>
                <p className="text-sm text-on-surface"><LinkedTitle value={it.title} link={it.link} /></p>
                {it.description && <p className="text-sm text-on-surface-variant">{it.description}</p>}
              </div>
            ))}
          </div>
        </Block>
      ))}
    </div>
  )
}
