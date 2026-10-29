import { useMediaQuery } from './useMediaQuery'

// CSS handles reduced motion for CSS animations (see index.css). This hook is
// for motion driven from JS: canvas loops, typewriters, scroll effects.
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
