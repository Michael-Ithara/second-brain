// The app's mark: two halves of a brain in lime on a cobalt tile — the brand pair.
// Same drawing as public/icon.svg (the favicon), so tab, sidebar and login match.

interface Props {
  size?: 'sm' | 'md'
}

export function BrandMark({ size = 'sm' }: Props) {
  const tile = size === 'sm' ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'
  const icon = size === 'sm' ? 14 : 20
  return (
    <div className={`${tile} shrink-0 flex items-center justify-center bg-brand text-accent shadow-[0_0_18px_rgba(36,87,255,0.35)]`} aria-hidden="true">
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-3.5-13A2.5 2.5 0 0 1 5.97 2H9.5z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l3.5-13A2.5 2.5 0 0 0 18.03 2H14.5z"/>
      </svg>
    </div>
  )
}
