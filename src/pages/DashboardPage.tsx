import { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { SpaceView } from '../components/SpaceView'
import { SpacesDrawer } from '../components/SpacesDrawer'
import { useSpaces } from '../hooks/useSpaces'
import type { Space } from '../types' //always import types with "import type" to avoid accidentally importing values and causing circular dependencies

export function DashboardPage() {
  // Lifted here so the desktop sidebar and the mobile drawer share one list.
  const { spaces, createSpace, deleteSpace } = useSpaces()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Derived from the list, so deleting the open space also closes it.
  const selectedSpace = spaces.find(s => s.id === selectedId) ?? null

  const renderSidebar = (onPicked?: () => void) => (
    <Sidebar
      spaces={spaces}
      selectedSpaceId={selectedSpace?.id ?? null}
      onSelectSpace={(space: Space) => { setSelectedId(space.id); onPicked?.() }}
      onCreateSpace={createSpace}
      onDeleteSpace={deleteSpace}
    />
  )

  return (
    <div className="flex h-dvh bg-canvas">
      <div className="hidden md:block shrink-0">
        {renderSidebar()}
      </div>

      {drawerOpen && (
        <SpacesDrawer onClose={() => setDrawerOpen(false)}>
          {renderSidebar(() => setDrawerOpen(false))}
        </SpacesDrawer>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar, narrow screens only: the sidebar lives in a drawer there */}
        <header className="md:hidden shrink-0 flex items-center gap-1 px-2 h-12 border-b border-line">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Spaces"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-ink-2 transition-colors hover:text-ink hover:bg-tint"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
            </svg>
          </button>
          <p className="font-display text-sm font-semibold text-ink truncate">
            {selectedSpace?.name ?? 'Second Brain'}
          </p>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedSpace ? (
            // key remounts per space so chat history and drafts don't carry over
            <SpaceView key={selectedSpace.id} space={selectedSpace} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-ink-2">Select a space or create a new one</p>
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden font-display text-sm font-semibold px-4 py-2.5 rounded-xl bg-accent text-on-accent shadow-edge hover:bg-accent-hover"
              >
                Choose a space
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
