// Label for the primary modifier key in keyboard hints: ⌘ on Apple, Ctrl elsewhere.
export const modKey = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl'

// True when a key press is typing into a field, so single-key shortcuts
// like "/" and Cmd/Ctrl+Z leave it alone.
export function isEditable(el: EventTarget | null) {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}
