// Extract hyperlink targets from a PDF the proper way, instead of grepping raw
// bytes. Many PDF generators (Chrome, Word, Canva, Figma, LaTeX) write link
// annotations inside compressed object streams, so a raw scan for /URI (...) can
// never see them. unpdf (pdf.js) decodes the real structure and returns every
// link, then each annotation is paired with the visible text drawn over it, so a
// Google Docs style CV "GitHub" / "Live Demo" / credential links survive upload.
import { getDocumentProxy, extractTextItems } from 'unpdf'
import type { StructuredTextItem } from 'unpdf'

export type LabeledPdfLink = { label: string; url: string }
export type PdfLinkExtract = { urls: string[]; labeled: LabeledPdfLink[] }

type Rect = [number, number, number, number]
type TextItem = Pick<StructuredTextItem, 'str' | 'x' | 'y' | 'width' | 'height'>
type LinkAnnotation = { subtype?: string; url?: string; rect?: number[] }

function normaliseUrl(value: string): string {
  const url = value.trim().replace(/[),.;\]}]+$/g, '').trim()
  if (!url) return ''
  const prefixed = url.startsWith('www.') ? `https://${url}` : url
  return /^(?:https?:\/\/|www\.)/i.test(prefixed) ? prefixed : ''
}

// Fallback label when the annotation has no readable text drawn over it.
function labelFor(url: string): string {
  const lower = url.toLowerCase()
  if (/github\.com/i.test(lower)) return 'GitHub'
  if (/gitlab\.com/i.test(lower)) return 'GitLab'
  if (/bitbucket\.org/i.test(lower)) return 'Bitbucket'
  if (/vercel\.app|vercel\.dev|netlify|heroku|onrender|pages\.dev|workers\.dev|azurewebsites|appspot|railway\.app|fly\.dev/i.test(lower)) return 'Live Demo'
  if (/replit\.com/i.test(lower)) return 'Replit'
  if (/devpost\.com/i.test(lower)) return 'Devpost'
  if (/behance\.net/i.test(lower)) return 'Behance'
  if (/dribbble\.com/i.test(lower)) return 'Dribbble'
  if (/credly|coursera|udemy|edx|credential|learn\.microsoft|aws\.amazon|comptia|cisco|oracle|hackthebox|tryhackme/i.test(lower)) return 'Credential'
  if (/demo|live|app|site|web/i.test(lower)) return 'Demo'
  return 'Open link'
}

// A link annotation is the clickable area over some visible text; the label is
// the text item whose centre sits inside (or just beside) the annotation rect.
function labelForAnnotation(rect: Rect, items: TextItem[]): string {
  const cx = (rect[0] + rect[2]) / 2
  const cy = (rect[1] + rect[3]) / 2
  const rx = (rect[2] - rect[0]) / 2
  const ry = (rect[3] - rect[1]) / 2
  let best: { str: string; d: number } | null = null
  for (const item of items) {
    const str = item.str.trim()
    if (!str) continue
    const ix = item.x + item.width / 2
    const iy = item.y + item.height / 2
    const inX = Math.abs(ix - cx) <= rx + item.width / 2 + 2
    const inY = Math.abs(iy - cy) <= ry + item.height / 2 + 2
    if (inX && inY) {
      const d = (ix - cx) ** 2 + (iy - cy) ** 2
      if (!best || d < best.d) best = { str, d }
    }
  }
  return best?.str || ''
}

function looksLikeUrl(value: string): boolean {
  return /(?:https?:\/\/|www\.)/i.test(value)
}

// Legacy byte-scan fallback for PDFs unpdf cannot open. Any URL claimed here
// still carries only a domain-derived label, since raw bytes carry no layout.
function fallbackScan(raw: string): LabeledPdfLink[] {
  const found: LabeledPdfLink[] = []
  const seen = new Set<string>()
  const push = (url: string) => {
    const clean = normaliseUrl(url)
    if (!clean || seen.has(clean.toLowerCase())) return
    seen.add(clean.toLowerCase())
    found.push({ label: labelFor(clean), url: clean })
  }
  for (const match of raw.matchAll(/(?:https?:\/\/|www\.)[^\s<>{}"']+/gi)) push(match[0])
  const uri = /\/URI\s*(?:\(((?:\\.|[^\\)])*)\)|<([0-9a-fA-F]+)>)/g
  for (const match of raw.matchAll(uri)) {
    const literal = match[1] ? match[1].replace(/\\([()\\])/g, '$1') : Buffer.from(match[2] || '', 'hex').toString('utf8')
    push(literal)
  }
  const hexUri = /<([0-9a-fA-F]{20,})>/g
  for (const match of raw.matchAll(hexUri)) {
    try {
      const decoded = Buffer.from(match[1], 'hex').toString('utf8')
      if (looksLikeUrl(decoded)) push(decoded)
    } catch { /* not decodable, skip */ }
  }
  return found
}

export async function extractPdfLinksDetailed(data: Uint8Array): Promise<PdfLinkExtract> {
  const labeled: LabeledPdfLink[] = []
  const seen = new Set<string>()
  let proxy: Awaited<ReturnType<typeof getDocumentProxy>> | null = null
  try {
    proxy = await getDocumentProxy(data)
  } catch (e) {
    console.error('unpdf could not open PDF:', e)
  }

  if (proxy) {
    try {
      const pages = await extractTextItems(proxy)
      for (let pageNumber = 1; pageNumber <= pages.totalPages; pageNumber++) {
        let annotations: LinkAnnotation[] = []
        try {
          const page = await proxy.getPage(pageNumber)
          annotations = (await page.getAnnotations()) as LinkAnnotation[]
        } catch { /* skip page */ }
        const items: TextItem[] = pages.items[pageNumber - 1] ?? []
        // Sort in reading order: top of page first, then left to right, so the
        // URLs come back in the same order a reader (and the model) sees them.
        const sorted = annotations
          .filter((a) => a.subtype === 'Link' && typeof a.url === 'string' && a.url && Array.isArray(a.rect) && a.rect.length === 4)
          .sort((a, b) => (b.rect![3] - a.rect![3]) || (a.rect![0] - b.rect![0]))
        for (const ann of sorted) {
          const rect = ann.rect as Rect
          const label = labelForAnnotation(rect, items)
          const clean = normaliseUrl(ann.url as string)
          if (clean && !seen.has(clean.toLowerCase())) {
            seen.add(clean.toLowerCase())
            labeled.push({ label: label || labelFor(clean), url: clean })
          }
        }
      }
    } catch (e) {
      console.error('unpdf link extraction failed:', e)
    }
  }

  // Some producers write links that pdf.js skips; fall back to the byte scan so
  // we never silently drop a CV hyperlink.
  if (labeled.length === 0) {
    const raw = Buffer.from(data).toString('latin1')
    for (const link of fallbackScan(raw)) {
      if (!seen.has(link.url.toLowerCase())) {
        seen.add(link.url.toLowerCase())
        labeled.push(link)
      }
    }
  }

  return { urls: labeled.map((link) => link.url), labeled }
}