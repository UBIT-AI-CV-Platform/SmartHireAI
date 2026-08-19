import { Document, Packer, Paragraph, TextRun, BorderStyle } from 'docx'

type Contact = { email?: string; phone?: string; location?: string; linkedin?: string; linkedin_url?: string; github?: string; github_url?: string; discord?: string; discord_url?: string }
type CVLike = {
  full_name: string
  title: string
  contact?: Contact
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

const ACCENT = '3525CD'
const MUTED = '6B6B6B'

const heading = (text: string) =>
  new Paragraph({
    spacing: { before: 260, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, color: ACCENT })],
  })

const meta = (text: string) => new Paragraph({ children: [new TextRun({ text, size: 18, color: MUTED })] })

export async function cvToDocxBlob(cv: CVLike): Promise<Blob> {
  const children: Paragraph[] = []

  // Header
  children.push(new Paragraph({ children: [new TextRun({ text: cv.full_name || '', bold: true, size: 44 })] }))
  if (cv.title) children.push(new Paragraph({ children: [new TextRun({ text: cv.title, size: 26, color: ACCENT, bold: true })] }))

  const contactParts = [
    cv.contact?.email, cv.contact?.phone, cv.contact?.location,
    cv.contact?.linkedin || cv.contact?.linkedin_url,
    cv.contact?.github || cv.contact?.github_url,
    cv.contact?.discord || cv.contact?.discord_url,
  ].filter(Boolean)
  if (contactParts.length) {
    children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: contactParts.join('  |  '), size: 18, color: MUTED })] }))
  }

  if (cv.summary) {
    children.push(heading('Professional Summary'))
    children.push(new Paragraph({ children: [new TextRun({ text: cv.summary, size: 20 })] }))
  }

  if (cv.experience?.length) {
    children.push(heading('Experience'))
    for (const e of cv.experience) {
      children.push(new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: e.role, bold: true, size: 22 }),
          ...(e.period ? [new TextRun({ text: `    ${e.period}`, size: 18, color: MUTED })] : []),
        ],
      }))
      if (e.organization) children.push(new Paragraph({ children: [new TextRun({ text: e.organization, size: 20, color: ACCENT, bold: true })] }))
      if (e.link) children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: e.link, size: 18, color: ACCENT })] }))
      for (const b of e.bullets || []) children.push(new Paragraph({ text: b, bullet: { level: 0 }, spacing: { after: 20 } }))
    }
  }

  if (cv.education?.length) {
    children.push(heading('Education'))
    for (const e of cv.education) {
      children.push(new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({ text: e.degree, bold: true, size: 22 }),
          ...(e.period ? [new TextRun({ text: `    ${e.period}`, size: 18, color: MUTED })] : []),
        ],
      }))
      if (e.institute) children.push(meta(e.institute))
    }
  }

  if (cv.skills?.length) {
    children.push(heading('Skills'))
    children.push(new Paragraph({ children: [new TextRun({ text: cv.skills.join('  •  '), size: 20 })] }))
  }

  const credList = (title: string, items?: { name: string; issuer?: string; provider?: string; date?: string; link?: string }[]) => {
    if (!items?.length) return
    children.push(heading(title))
    for (const c of items) {
      const sub = [c.issuer || c.provider, c.date].filter(Boolean).join(' • ')
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 20 },
        children: [new TextRun({ text: c.name, bold: true, size: 20 }), ...(sub ? [new TextRun({ text: `  (${sub})`, size: 18, color: MUTED })] : [])],
      }))
      if (c.link) children.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: c.link, size: 18, color: ACCENT })] }))
    }
  }
  credList('Certifications', cv.certifications)
  credList('Courses', cv.courses)
  credList('Awards', cv.awards)

  if (cv.projects?.length) {
    children.push(heading('Projects'))
    for (const project of cv.projects) {
      children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: project.name, bold: true, size: 20 }), ...(project.date ? [new TextRun({ text: `    ${project.date}`, size: 18, color: MUTED })] : [])] }))
      if (project.description) children.push(new Paragraph({ children: [new TextRun({ text: project.description, size: 20 })] }))
      const links = (project.links ?? []).filter((link, index, all) => link.url && all.findIndex((item) => item.url === link.url) === index)
      for (const link of links) children.push(new Paragraph({ children: [new TextRun({ text: `${link.label}: ${link.url}`, size: 18, color: ACCENT })] }))
      if (project.link && !links.some((link) => link.url === project.link)) children.push(new Paragraph({ children: [new TextRun({ text: project.link, size: 18, color: ACCENT })] }))
    }
  }

  for (const s of cv.custom_sections || []) {
    if (!s.heading || !s.items?.length) continue
    children.push(heading(s.heading))
    for (const it of s.items) {
      children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: it.title, bold: true, size: 20 })] }))
      if (it.description) children.push(new Paragraph({ children: [new TextRun({ text: it.description, size: 20 })] }))
      if (it.link) children.push(new Paragraph({ children: [new TextRun({ text: it.link, size: 18, color: ACCENT })] }))
    }
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}
