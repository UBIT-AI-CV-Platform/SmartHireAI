import { Document, Packer, Paragraph, TextRun, BorderStyle } from 'docx'

type Contact = { email?: string; phone?: string; location?: string; linkedin?: string; linkedin_url?: string; github?: string; github_url?: string; discord?: string; discord_url?: string }
type CVLike = {
  full_name: string
  title: string
  contact?: Contact
  summary?: string
  experience?: { role: string; organization: string; period: string; bullets: string[] }[]
  education?: { degree: string; institute: string; period: string }[]
  skills?: string[]
  certifications?: { name: string; issuer?: string; date?: string }[]
  courses?: { name: string; provider?: string; date?: string }[]
  awards?: { name: string; issuer?: string; date?: string }[]
  custom_sections?: { heading: string; items: { title: string; description?: string }[] }[]
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

  const credList = (title: string, items?: { name: string; issuer?: string; provider?: string; date?: string }[]) => {
    if (!items?.length) return
    children.push(heading(title))
    for (const c of items) {
      const sub = [c.issuer || c.provider, c.date].filter(Boolean).join(' • ')
      children.push(new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 20 },
        children: [new TextRun({ text: c.name, bold: true, size: 20 }), ...(sub ? [new TextRun({ text: `  (${sub})`, size: 18, color: MUTED })] : [])],
      }))
    }
  }
  credList('Certifications', cv.certifications)
  credList('Courses', cv.courses)
  credList('Awards', cv.awards)

  for (const s of cv.custom_sections || []) {
    if (!s.heading || !s.items?.length) continue
    children.push(heading(s.heading))
    for (const it of s.items) {
      children.push(new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: it.title, bold: true, size: 20 })] }))
      if (it.description) children.push(new Paragraph({ children: [new TextRun({ text: it.description, size: 20 })] }))
    }
  }

  const doc = new Document({ sections: [{ children }] })
  return Packer.toBlob(doc)
}
