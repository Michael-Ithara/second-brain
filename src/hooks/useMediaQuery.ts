import { useSyncExternalStore } from 'react'

// Live result of a CSS media query, for the few places JS has to follow what
// CSS already knows (reduced motion, light/dark for third-party widgets).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    onChange => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
