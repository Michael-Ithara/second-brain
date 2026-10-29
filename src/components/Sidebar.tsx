import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Space } from '../types'
import { BrandMark } from './BrandMark'
import { modKey } from '../lib/platform'

interface Props {
  spaces: Space[]
  loading: boolean
  selectedSpaceId: string | null
  onSelectSpace: (space: Space) => void
  onCreateSpace: (name: string) => Promise<void>
  onDeleteSpace: (id: string) => void
  onOpenPalette: () => void
  // The open space's file list, shown under the spaces.
  children?: React.ReactNode
}

export function Sidebar({ spaces, loading, selectedSpaceId, onSelectSpace, onCreateSpace, onDeleteSpace, onOpenPalette, children }: Props) {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  // Escape closes the field, which also blurs it; this stops that blur from creating the space.
  const cancelled = useRef(false)

  // Enter creates, then the field closes and blurs — the guard stops that blur creating it twice.
  const creating = useRef(false)

  const handleCreateSpace = async () => {
    const name = newSpaceName.trim()
    if (!name || creating.current) return
    creating.current = true
    setNewSpaceName('')
    setIsCreating(false)
    await onCreateSpace(name)
    creating.current = false
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSpace()
    if (e.key === 'Escape') {
      cancelled.current = true
      setNewSpaceName('')
      setIsCreating(false)
    }
  }

  // Like naming a new folder in Finder: clicking away keeps the name.
  const handleBlur = () => {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    if (newSpaceName.trim()) handleCreateSpace()
    else setIsCreating(false)
  }

  return (
    <aside className="w-64 h-full flex flex-col bg-canvas border-r border-line">
      {/* Header */}
      <div className="px-5 py-5 border-b border-line">
        <div className="flex items-center gap-2">
          <BrandMark />
          <h1 className="font-display text-base font-bold tracking-tight text-ink">
            Second Brain
          </h1>
        </div>
        <p className="text-xs mt-2 truncate text-ink-3 pl-9">
          {user?.email}
        </p>
      </div>

      {/* Opens the ⌘K palette; also how touch users get to it */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenPalette}
          className="w-full flex items-center gap-2 px-3 py-2 pointer-coarse:py-3 rounded-lg text-sm text-ink-3 bg-surface border border-line transition-colors hover:border-line-2 hover:text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/>
          </svg>
          <span className="flex-1 text-left">Search</span>
          <kbd className="pointer-coarse:hidden text-[0.7rem] leading-none px-1.5 py-1 rounded border border-line-2 font-sans">{modKey} K</kbd>
        </button>
      </div>

      {/* Spaces */}
      {/* With a file list below, spaces get at most a third of the height and scroll on their own. */}
      <nav aria-labelledby="spaces-heading" className={`overflow-y-auto px-3 py-4 ${children ? 'shrink-0 max-h-[33%] border-b border-line' : 'flex-1'}`}>
        <div className="flex items-center justify-between mb-2 pl-2">
          <h2 id="spaces-heading" className="text-xs font-medium uppercase tracking-[0.12em] text-ink-3">
            Spaces
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            aria-label="New space"
            title="New space"
            className="w-7 h-7 pointer-coarse:w-10 pointer-coarse:h-10 pointer-coarse:-mr-1.5 flex items-center justify-center rounded-md text-ink-3 transition-colors hover:text-accent-ink hover:bg-tint-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {isCreating && (
          <input
            autoFocus
            type="text"
            value={newSpaceName}
            onChange={e => setNewSpaceName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Space name..."
            aria-label="New space name"
            className="w-full text-sm rounded-lg px-3 py-2 mb-1 bg-surface border border-field text-ink placeholder:text-ink-3 focus:border-ring focus-visible:outline-none"
          />
        )}

        {loading && (
          <div role="status" className="flex flex-col gap-1 px-1">
            <span className="sr-only">Loading spaces</span>
            {['w-3/5', 'w-4/5', 'w-1/2'].map(w => (
              <div key={w} className="h-9 flex items-center px-2" aria-hidden="true">
                <div className={`h-2.5 ${w} rounded bg-tint-2 animate-pulse`} />
              </div>
            ))}
          </div>
        )}

        <ul>
          {spaces.map(space => {
            const selected = selectedSpaceId === space.id
            return (
              <li key={space.id} className="group relative mb-0.5">
                <button
                  onClick={() => onSelectSpace(space)}
                  aria-current={selected ? 'page' : undefined}
                  className={`w-full text-left pl-3 pr-9 py-2 pointer-coarse:py-3 pointer-coarse:pr-12 rounded-lg text-sm border transition-colors ${
                    selected
                      ? 'bg-brand text-on-brand border-transparent font-medium'
                      : 'text-ink-2 border-transparent hover:bg-tint hover:text-ink'
                  }`}
                >
                  <span className="block truncate">{space.name}</span>
                </button>
                {/* Sibling of the select button, not nested in it, so it gets its own focus stop. */}
                <button
                  onClick={() => onDeleteSpace(space.id)}
                  aria-label={`Delete space ${space.name}`}
                  title="Delete space"
                  className={`absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 pointer-coarse:w-10 pointer-coarse:h-10 flex items-center justify-center rounded-md transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 ${
                    // On the cobalt selected row, muted grey would fail contrast; use the on-brand white.
                    selected ? 'text-on-brand hover:bg-white/15' : 'text-ink-3 hover:text-danger hover:bg-danger-tint'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>

        {!loading && spaces.length === 0 && !isCreating && (
          <p className="text-xs px-2 mt-2 text-ink-3">
            No spaces yet. Select + to create one.
          </p>
        )}
      </nav>

      {children && <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>}

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-line">
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs px-2 py-1.5 pointer-coarse:py-3 rounded-md text-ink-2 transition-colors hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
