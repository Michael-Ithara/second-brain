import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSpaces } from '../hooks/useSpaces'
import type { Space } from '../types'

interface Props {
  selectedSpaceId: string | null
  onSelectSpace: (space: Space) => void
}

export function Sidebar({ selectedSpaceId, onSelectSpace }: Props) {
  const { user } = useAuth()
  const { spaces, createSpace, deleteSpace } = useSpaces()
  const [isCreating, setIsCreating] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return
    await createSpace(newSpaceName.trim())
    setNewSpaceName('')
    setIsCreating(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSpace()
    if (e.key === 'Escape') setIsCreating(false)
  }

  return (
    <aside className="w-64 h-screen flex flex-col" style={{
      background: 'linear-gradient(180deg, #0f0f0f 0%, #111318 100%)',
      borderRight: '1px solid rgba(255,255,255,0.06)'
    }}>
      {/* Header */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: '1.25rem',
          color: '#f0ede8',
          letterSpacing: '-0.01em'
        }}>
          Second Brain
        </h1>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#4a4a5a' }}>
          {user?.email}
        </p>
      </div>

      {/* Spaces list */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#3a3a4a' }}>
            Spaces
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="transition-colors rounded p-0.5"
            style={{ color: '#3a3a4a' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#a0a0b0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
            title="New space"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            onBlur={() => setIsCreating(false)}
            placeholder="Space name..."
            className="w-full text-sm rounded-lg px-3 py-2 mb-1 outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f0ede8'
            }}
          />
        )}

        {spaces.map(space => (
          <button
            key={space.id}
            onClick={() => onSelectSpace(space)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all group flex items-center justify-between mb-0.5"
            style={{
              background: selectedSpaceId === space.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: selectedSpaceId === space.id ? '#f0ede8' : '#5a5a6a',
            }}
            onMouseEnter={e => {
              if (selectedSpaceId !== space.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = '#a0a0b0'
              }
            }}
            onMouseLeave={e => {
              if (selectedSpaceId !== space.id) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#5a5a6a'
              }
            }}
          >
            <span className="truncate">{space.name}</span>
            <span
              onClick={e => { e.stopPropagation(); deleteSpace(space.id) }}
              className="opacity-0 group-hover:opacity-100 text-xs ml-2 transition-opacity"
              style={{ color: '#5a5a6a' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#5a5a6a')}
            >
              ✕
            </span>
          </button>
        ))}

        {spaces.length === 0 && !isCreating && (
          <p className="text-xs px-2 mt-2" style={{ color: '#3a3a4a' }}>
            No spaces yet. Hit + to create one.
          </p>
        )}
      </div>

      {/* Sign out */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs transition-colors"
          style={{ color: '#3a3a4a' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#6a6a7a')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}