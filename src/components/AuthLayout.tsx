import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark'

// Split screen for the auth pages: a dark brand panel on wide screens, the
// form on the right. On phones only the form shows, with the mark above it.
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — always dark, like the landing page */}
      <aside className="scheme-dark hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-canvas text-ink">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(70% 55% at 30% 40%, rgba(36,87,255,0.35) 0%, transparent 70%), radial-gradient(40% 30% at 80% 85%, rgba(200,255,61,0.12) 0%, transparent 70%)',
        }} />
        <Link to="/" className="relative flex items-center gap-2 self-start rounded-full pr-2">
          <BrandMark />
          <span className="font-display text-base font-extrabold tracking-tight">Second Brain</span>
        </Link>

        <div className="relative">
          <p className="font-display font-extrabold leading-[0.9] tracking-[-0.05em] text-[clamp(3rem,5.5vw,5.5rem)]">
            Your notes,<br />
            <span className="text-accent">answering back.</span>
          </p>
          <ul className="mt-10 space-y-3 text-ink-2">
            {['Write notes or import any web page', 'Ask questions in plain words', 'See which notes every answer came from'].map(t => (
              <li key={t} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-3">Your notes stay private to your account.</p>
      </aside>

      {/* Form side */}
      <main className="min-h-dvh lg:min-h-0 flex flex-col px-4 sm:px-8 py-6">
        <Link to="/" className="lg:hidden flex items-center gap-2 self-start rounded-full pr-2">
          <BrandMark />
          <span className="font-display text-base font-extrabold tracking-tight text-ink">Second Brain</span>
        </Link>
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  )
}

