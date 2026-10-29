import { useSyncExternalStore } from 'react'

// CSS handles reduced motion for CSS animations (see index.css). This hook is
// for motion driven from JS: canvas loops, typewriters, scroll effects.
const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
