// Normalize a parsed CV so the Projects section only holds real technical
// projects. Portfolio / personal-brand entries (e.g. "Sufiyan Cloud", a project
// named "Portfolio") end up there too after extraction, and they belong in the
// Portfolio custom section instead. Shared between the upload route (server) and
// the CV generator (client) so the preview reflects the cleanup immediately.
type CleanProject = { name?: string; links?: { label?: string; url?: string }[]; link?: string }
type CleanCustomSection = { heading?: string; items?: { title?: string }[] }
export type CleanCv = {
  full_name?: string
  projects?: CleanProject[]
  custom_sections?: CleanCustomSection[]
}

export function cleanCvProjects(cv: CleanCv): void {
  if (!Array.isArray(cv.projects) || cv.projects.length === 0) return

  const norm = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  const nameTokens = String(cv.full_name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 5)

  // Everything the CV already lists under a titled section (item title or the
  // section heading itself, e.g. a section literally called "Portfolio").
  const sectionNames = new Set<string>()
  for (const section of Array.isArray(cv.custom_sections) ? cv.custom_sections : []) {
    const heading = norm(section.heading)
    if (heading.length >= 3) sectionNames.add(heading)
    for (const item of Array.isArray(section.items) ? section.items : []) {
      const title = norm(item.title)
      if (title.length >= 3) sectionNames.add(title)
    }
  }

  const isBrandEntry = (name: string): boolean => {
    if (!name) return false
    if (name.includes('portfolio')) return true
    if (sectionNames.has(name)) return true
    for (const token of nameTokens) {
      if (name.length <= 14 && name.startsWith(token) && name !== token) return true
    }
    return false
  }

  cv.projects = cv.projects.filter((project) => !isBrandEntry(norm(project.name)))
}