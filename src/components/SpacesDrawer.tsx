import { useEffect, useRef } from 'react'

interface Props {
  children: React.ReactNode
  onClose: () => void
}

// The sidebar as a left-edge sheet for narrow screens. Same modal pattern as
// UrlImportModal: showModal() traps focus, Escape closes, and focus goes back
// to the button that opened it.
export function SpacesDrawer({ children, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) dialog.showModal()
    return () => opener?.focus()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-label="Spaces"
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="m-0 h-dvh max-h-none w-64 max-w-[85vw] p-0 bg-canvas shadow-dialog backdrop:bg-black/50"
    >
      {children}
    </dialog>
  )
}
