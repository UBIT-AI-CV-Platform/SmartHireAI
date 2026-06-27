'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * App-wide theme provider.
 * - attribute="class"  -> toggles the `dark` class on <html> (Tailwind v4 dark variant)
 * - defaultTheme="system" + enableSystem -> first visit matches the OS preference,
 *   then next-themes remembers the user's manual choice in localStorage ("theme").
 * - disableTransitionOnChange -> no color-transition jank when flipping themes.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
