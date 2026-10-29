import { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { SpaceView } from '../components/SpaceView'
import type { Space } from '../types' //always import types with "import type" to avoid accidentally importing values and causing circular dependencies

export function DashboardPage() {
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar
        selectedSpaceId={selectedSpace?.id ?? null}
        onSelectSpace={setSelectedSpace}
      />

      <main className="flex-1 overflow-y-auto">
        {selectedSpace ? (
          // key remounts per space so chat history and drafts don't carry over
          <SpaceView key={selectedSpace.id} space={selectedSpace} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-600">Select a space or create a new one</p>
          </div>
        )}
      </main>
    </div>
  )
}