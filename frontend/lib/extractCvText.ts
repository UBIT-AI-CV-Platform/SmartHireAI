// Extract readable plain text from a CV file so it can be sent to Gemini as a
// text part. PDFs are sent to Gemini as binary inlineData; everything else
// (docx / doc / rtf / txt) is reduced to text here because Gemini's Files API
// and inlineData do NOT accept Word or RTF mime types.
import mammoth from 'mammoth'
import WordExtractor from 'word-extractor'
import { stripRtf } from 'rtf-to-text'

const wordExtractor = new WordExtractor()

// Reduce HTML to readable text, preserving hyperlinks as "label (url)" so the
// parser never loses a certificate / project URL hidden in a .docx link.
function htmlToText(html: string): string {
  return html
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
      const label = inner.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
      return label ? `${label} (${href})` : `(${href})`
    })
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\u0000/g, '')
    .trim()
}

async function docxToText(buffer: Buffer): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  return htmlToText(html)
}

export async function extractCvText(buffer: Buffer, mime: string): Promise<string> {
  if (mime === 'text/plain') {
    return buffer.toString('utf8').replace(/\u0000/g, '')
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const text = await docxToText(buffer)
    if (text.trim()) return text.trim()
  }

  if (mime === 'application/rtf') {
    // Pull hyperlink targets out of { \field ... HYPERLINK "url" ... } blocks
    // before stripping control words, so certificate / project URLs survive.
    const raw = buffer.toString('utf8')
    const withUrls = raw.replace(/\\field\b[\s\S]*?\\fldinst\b[\s\S]*?HYPERLINK\s+"([^"]+)"/gi, (_m, url: string) => ` ${url} `)
    const text = stripRtf(withUrls)
    if (text.trim()) return text.trim()
  }

  // Legacy binary .doc (and any other Word-ish file) via word-extractor, which
  // also handles RTF-in-doc files.
  try {
    const doc = await wordExtractor.extract(buffer)
    const text = (doc.getBody() || '').replace(/\u0000/g, '')
    if (text.trim()) return text.trim()
  } catch (e) {
    // Some .doc files are really RTF (Word 2003 style) or plain text.
    const head = buffer.subarray(0, 128).toString('utf8').trimStart()
    if (head.startsWith('{\\rtf')) {
      const text = stripRtf(buffer.toString('utf8'))
      if (text.trim()) return text.trim()
    }
    const asText = buffer.toString('utf8')
    const printable = asText.replace(/[^\x09\x0a\x0d\x20-\x7e\x80-\xff]/g, '')
    if (printable.length > asText.length * 0.85 && printable.trim()) return printable.trim()
    console.error('extractCvText failed:', e)
  }

  throw new Error('Could not read the text from this file. Please try a PDF.')
}
