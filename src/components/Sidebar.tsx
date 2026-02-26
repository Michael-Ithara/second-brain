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
      background: '#080c14',
      borderRight: '1px solid rgba(79,156,249,0.08)',
    }}>
      {/* Header */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(79,156,249,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f9cf9" strokeWidth="2">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-3.5-13A2.5 2.5 0 0 1 5.97 2H9.5z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l3.5-13A2.5 2.5 0 0 0 18.03 2H14.5z"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>
            Second Brain
          </h1>
        </div>
        <p className="text-xs mt-2 truncate" style={{ color: '#334155', paddingLeft: '2.25rem' }}>
          {user?.email}
        </p>
      </div>

      {/* Spaces */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: '#1e3a5f', letterSpacing: '0.12em' }}>
            Spaces
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="transition-colors rounded p-0.5"
            style={{ color: '#1e3a5f' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#4f9cf9')}
            onMouseLeave={e => (e.currentTarget.style.color = '#1e3a5f')}
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
              background: 'rgba(79,156,249,0.06)',
              border: '1px solid rgba(79,156,249,0.2)',
              color: '#e2e8f0',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          />
        )}

        {spaces.map(space => (
          <button
            key={space.id}
            onClick={() => onSelectSpace(space)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all group flex items-center justify-between mb-0.5"
            style={{
              background: selectedSpaceId === space.id ? 'rgba(79,156,249,0.1)' : 'transparent',
              color: selectedSpaceId === space.id ? '#4f9cf9' : '#475569',
              border: selectedSpaceId === space.id ? '1px solid rgba(79,156,249,0.2)' : '1px solid transparent',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={e => {
              if (selectedSpaceId !== space.id) {
                e.currentTarget.style.background = 'rgba(79,156,249,0.05)'
                e.currentTarget.style.color = '#94a3b8'
              }
            }}
            onMouseLeave={e => {
              if (selectedSpaceId !== space.id) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#475569'
              }
            }}
          >
            <span className="truncate">{space.name}</span>
            <span
              onClick={e => { e.stopPropagation(); deleteSpace(space.id) }}
              className="opacity-0 group-hover:opacity-100 text-xs ml-2 transition-opacity"
              style={{ color: '#475569' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              ✕
            </span>
          </button>
        ))}

        {spaces.length === 0 && !isCreating && (
          <p className="text-xs px-2 mt-2" style={{ color: '#1e3a5f', fontFamily: "'Inter', system-ui, sans-serif" }}>
            No spaces yet. Hit + to create one.
          </p>
        )}
      </div>

      {/* Sign out */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(79,156,249,0.06)' }}>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs transition-colors"
          style={{ color: '#1e3a5f', fontFamily: "'Inter', system-ui, sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
          onMouseLeave={e => (e.currentTarget.style.color = '#1e3a5f')}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}