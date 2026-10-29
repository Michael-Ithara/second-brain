import type { EmbedStatus } from '../types'

// How far behind chat search is on a note. Nothing when it's up to date.
export function EmbedBadge({ status, onRetry }: { status?: EmbedStatus; onRetry: () => void }) {
  if (status === 'pending') {
    // Not a live region: it reappears on every save while typing.
    return <span className="text-ink-3" title="Chat uses the previous version until then">Search updates shortly</span>
  }
  if (status === 'embedding') {
    return <span role="status" className="text-ink-3">Updating search…</span>
  }
  if (status === 'stale' || status === 'missing') {
    return (
      <span className="flex items-center gap-1.5">
        {status === 'missing'
          ? <span className="text-danger">Not searchable</span>
          : <span className="text-ink-2">Search has an older version</span>}
        <button
          onClick={onRetry}
          className="rounded px-1 -mx-1 text-accent-ink hover:text-accent-ink-hover hover:underline"
        >
          {status === 'missing' ? 'Retry' : 'Update'}
        </button>
      </span>
    )
  }
  return null
}
