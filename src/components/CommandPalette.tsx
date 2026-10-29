import { useEffect, useId, useRef, useState } from 'react'

export interface Command {
  id: string
  group: string
  label: string
  // Short context on the right, e.g. a note's space or a key hint.
  hint?: string
  run: () => void
}

interface Props {
  // Recomputed on every keystroke; the palette only filters by what it's given.
  getCommands: (query: string) => Command[]
  onClose: () => void
}

// ⌘K / Ctrl+K: one box to jump to a note or space, start a note, or ask.
// A combobox over a listbox: focus stays in the input, arrows move the
// highlighted option (aria-activedescendant), Enter runs it.
export function CommandPalette({ getCommands, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listId = useId()
  const commands = getCommands(query.trim())
  const current = commands[Math.min(active, commands.length - 1)]

  // Same modal pattern as the other dialogs: showModal() traps focus, Escape
  // fires close, and focus goes back to whatever opened it.
  useEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) dialog.showModal()
    return () => opener?.focus()
  }, [])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [current])

  // Close first, run after: while the modal is open the page behind it is inert,
  // so a command that moves focus (New note) would otherwise be undone.
  const runCommand = (command: Command) => {
    onClose()
    setTimeout(command.run, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const count = commands.length
      if (count === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      // From the previous value, so fast repeats each move one step.
      setActive(prev => (Math.min(prev, count - 1) + step + count) % count)
    } else if (e.key === 'Enter' && current) {
      e.preventDefault()
      runCommand(current)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl p-0 bg-transparent backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="pop-in rounded-2xl overflow-hidden bg-surface border border-line-2 shadow-dialog">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <svg className="shrink-0 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/>
          </svg>
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            aria-autocomplete="list"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search notes and spaces, or ask a question"
            aria-label="Search notes and spaces, or ask a question"
            className="flex-1 min-w-0 h-13 bg-transparent text-[0.95rem] text-ink placeholder:text-ink-3 focus-visible:outline-none"
          />
          <kbd className="pointer-coarse:hidden shrink-0 text-[0.7rem] leading-none px-1.5 py-1 rounded border border-line-2 text-ink-3 font-sans">Esc</kbd>
        </div>

        <ul ref={listRef} id={listId} role="listbox" aria-label="Results" className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {commands.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-ink-3">Nothing matches.</li>
          )}
          {commands.map((command, i) => {
            const selected = command === current
            const newGroup = i === 0 || commands[i - 1].group !== command.group
            return (
              <li key={command.id} role="presentation">
                {newGroup && (
                  <p role="presentation" className="px-3 pt-2 pb-1 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-ink-3">
                    {command.group}
                  </p>
                )}
                <div
                  id={`${listId}-${command.id}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => runCommand(command)}
                  onMouseMove={() => { if (!selected) setActive(i) }}
                  className={`flex items-center justify-between gap-3 px-3 py-2 pointer-coarse:py-3 rounded-lg text-sm cursor-pointer ${
                    selected ? 'bg-brand text-on-brand' : 'text-ink'
                  }`}
                >
                  <span className="truncate">{command.label}</span>
                  {command.hint && (
                    <span className={`shrink-0 text-xs ${selected ? 'text-on-brand/80' : 'text-ink-3'}`}>{command.hint}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <p className="pointer-coarse:hidden px-4 py-2 text-xs text-ink-3 border-t border-line">
          ↑ ↓ to move · Enter to open · Esc to close
        </p>
      </div>
    </dialog>
  )
}
