import { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { SpaceView } from '../components/SpaceView'
import type { Space } from '../types'

export function DashboardPage() {
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: '#080c14' }}
    >
      <Sidebar
        selectedSpaceId={selectedSpace?.id ?? null}
        onSelectSpace={setSelectedSpace}
      />

      <main className="flex-1 overflow-hidden">
        {selectedSpace ? (
          <SpaceView space={selectedSpace} />
        ) : (
          // Empty state — no space selected
          <div
            className="h-full flex flex-col items-center justify-center gap-4"
            style={{
              background: '#080c14',
              backgroundImage: [
                'linear-gradient(rgba(91,156,246,0.025) 1px, transparent 1px)',
                'linear-gradient(90deg, rgba(91,156,246,0.025) 1px, transparent 1px)',
              ].join(', '),
              backgroundSize: '40px 40px',
            }}
          >
            {/* Radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(91,156,246,0.05) 0%, transparent 65%)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center gap-4 text-center px-8">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(91,156,246,0.08)',
                  border: '1px solid rgba(91,156,246,0.18)',
                  boxShadow: '0 0 32px rgba(91,156,246,0.1)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b9cf6" strokeWidth="1.5">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-3.5-13A2.5 2.5 0 0 1 5.97 2H9.5z"/>
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l3.5-13A2.5 2.5 0 0 0 18.03 2H14.5z"/>
                </svg>
              </div>

              <div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '-0.02em',
                    marginBottom: '0.5rem',
                    fontFamily: 'inherit',
                  }}
                >
                  Select a space
                </h2>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#475569',
                    maxWidth: '260px',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                  }}
                >
                  Choose a space from the sidebar or create a new one to get started.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}