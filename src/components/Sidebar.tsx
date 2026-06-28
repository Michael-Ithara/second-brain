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
    <aside
      className="w-64 h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #0c1220 0%, #080c14 100%)',
        borderRight: '1px solid rgba(91,156,246,0.1)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: '1px solid rgba(91,156,246,0.08)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(91,156,246,0.15)',
              border: '1px solid rgba(91,156,246,0.3)',
              boxShadow: '0 0 12px rgba(91,156,246,0.15)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5b9cf6" strokeWidth="2">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-3.5-13A2.5 2.5 0 0 1 5.97 2H9.5z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l3.5-13A2.5 2.5 0 0 0 18.03 2H14.5z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
            Second Brain
          </h1>
        </div>
        <p className="text-xs mt-2 truncate" style={{ color: '#1e3a5f', paddingLeft: '2.35rem' }}>
          {user?.email}
        </p>
      </div>

      {/* Spaces list */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: '#1e3a5f', letterSpacing: '0.12em' }}
          >
            Spaces
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="transition-all duration-200 rounded p-0.5"
            style={{ color: '#1e3a5f' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#5b9cf6'
              e.currentTarget.style.filter = 'drop-shadow(0 0 4px rgba(91,156,246,0.5))'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#1e3a5f'
              e.currentTarget.style.filter = 'none'
            }}
            title="New space"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
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
              background: 'rgba(91,156,246,0.06)',
              border: '1px solid rgba(91,156,246,0.25)',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          />
        )}

        {spaces.map(space => {
          const isSelected = selectedSpaceId === space.id
          return (
            <button
              key={space.id}
              onClick={() => onSelectSpace(space)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 group flex items-center justify-between mb-0.5"
              style={{
                background: isSelected ? 'rgba(91,156,246,0.12)' : 'transparent',
                color: isSelected ? '#5b9cf6' : '#475569',
                border: isSelected ? '1px solid rgba(91,156,246,0.25)' : '1px solid transparent',
                boxShadow: isSelected ? 'inset 0 0 12px rgba(91,156,246,0.08)' : 'none',
                fontWeight: isSelected ? 500 : 400,
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(91,156,246,0.06)'
                  e.currentTarget.style.color = '#94a3b8'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#475569'
                }
              }}
            >
              <span className="truncate">{space.name}</span>
              <span
                onClick={e => { e.stopPropagation(); deleteSpace(space.id) }}
                className="opacity-0 group-hover:opacity-100 text-xs ml-2 transition-all duration-200"
                style={{ color: '#475569' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                ✕
              </span>
            </button>
          )
        })}

        {spaces.length === 0 && !isCreating && (
          <p className="text-xs px-2 mt-2" style={{ color: '#1e3a5f' }}>
            No spaces yet. Hit + to create one.
          </p>
        )}
      </div>

      {/* Sign out */}
      <div
        className="px-5 py-4"
        style={{ borderTop: '1px solid rgba(91,156,246,0.08)' }}
      >
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs transition-colors duration-200"
          style={{ color: '#1e3a5f' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
          onMouseLeave={e => (e.currentTarget.style.color = '#1e3a5f')}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}