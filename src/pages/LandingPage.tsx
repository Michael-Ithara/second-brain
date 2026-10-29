import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { BrandMark } from '../components/BrandMark'

// The landing page is always dark (.scheme-dark): the extruded type, glows and
// canvas are drawn for a near-black background. Colours come from the tokens in
// index.css; the few raw values left are the extrusion and glow shades.

const COBALT = '36,87,255'
const LIME = '200,255,61'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  pulsePhase: number
  glowing: boolean
}

interface Pulse {
  fromNode: number
  toNode: number
  progress: number
  speed: number
}

// ── Neural Grid Canvas ────────────────────────────────────────────────────────
// Cobalt network; lime marks activity (pulses travelling along links, nodes
// near the pointer) — the same roles the colours have in the app.

function NeuralGrid() {
  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -999, y: -999 })
  const stateRef = useRef<{ nodes: Particle[]; pulses: Pulse[]; frame: number }>({
    nodes: [],
    pulses: [],
    frame: 0,
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initNodes()
    }

    const initNodes = () => {
      const count = Math.max(Math.floor((canvas.width * canvas.height) / 16000), 12)
      stateRef.current.nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 2 + 1,
        pulsePhase: Math.random() * Math.PI * 2,
        glowing: Math.random() > 0.75,
      }))
    }

    const spawnPulse = () => {
      const { nodes, pulses } = stateRef.current
      if (pulses.length > 8 || nodes.length < 2) return
      const fromIdx = Math.floor(Math.random() * nodes.length)
      const candidates = nodes
        .map((n, i) => {
          const dx = n.x - nodes[fromIdx].x
          const dy = n.y - nodes[fromIdx].y
          return { i, dist: Math.sqrt(dx * dx + dy * dy) }
        })
        .filter(c => c.i !== fromIdx && c.dist < 200)
        .sort((a, b) => a.dist - b.dist)
      if (candidates.length > 0) {
        const toIdx = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))].i
        pulses.push({ fromNode: fromIdx, toNode: toIdx, progress: 0, speed: 0.008 + Math.random() * 0.012 })
      }
    }

    const draw = () => {
      const { nodes, frame } = stateRef.current
      stateRef.current.frame = frame + 1
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Faint grid
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 1
      const gs = 64
      for (let x = 0; x < canvas.width; x += gs) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gs) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      const mouse = mouseRef.current

      nodes.forEach(p => {
        p.x += p.vx; p.y += p.vy
        p.pulsePhase += 0.02
        const dx = mouse.x - p.x
        const dy = mouse.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 160 && dist > 0) {
          p.vx += (dx / dist) * 0.015
          p.vy += (dy / dist) * 0.015
        }
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > 1.2) { p.vx *= 0.95; p.vy *= 0.95 }
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
      })

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 140) {
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(${COBALT},${(1 - dist / 140) * 0.35})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Pulses
      stateRef.current.pulses = stateRef.current.pulses.filter(pulse => {
        pulse.progress += pulse.speed
        if (pulse.progress >= 1) return false
        const from = nodes[pulse.fromNode]
        const to = nodes[pulse.toNode]
        if (!from || !to) return false
        const px = from.x + (to.x - from.x) * pulse.progress
        const py = from.y + (to.y - from.y) * pulse.progress
        const g = ctx.createRadialGradient(px, py, 0, px, py, 9)
        g.addColorStop(0, `rgba(${LIME},0.9)`)
        g.addColorStop(0.4, `rgba(${LIME},0.3)`)
        g.addColorStop(1, `rgba(${LIME},0)`)
        ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#efffc4'; ctx.fill()
        return true
      })

      // Nodes
      nodes.forEach(p => {
        const pulse = Math.sin(p.pulsePhase) * 0.4 + 0.6
        const near = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2) < 100
        if (p.glowing || near) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16)
          g.addColorStop(0, near ? `rgba(${LIME},${0.45 * pulse})` : `rgba(${COBALT},${0.5 * pulse})`)
          g.addColorStop(1, near ? `rgba(${LIME},0)` : `rgba(${COBALT},0)`)
          ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2)
          ctx.fillStyle = g; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = near ? `rgba(${LIME},${pulse})` : `rgba(90,130,255,${0.6 * pulse})`
        ctx.fill()
      })

      // With reduced motion, draw a single still frame and stop.
      if (reducedMotion) return
      if (frame % 90 === 0) spawnPulse()
      animId = requestAnimationFrame(draw)
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onMouseLeave = () => { mouseRef.current = { x: -999, y: -999 } }

    // The loop redraws on its own; a still frame has to be redrawn after a resize.
    const onResize = () => { resize(); if (reducedMotion) draw() }

    resize()
    draw()
    window.addEventListener('resize', onResize)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [reducedMotion])

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" />
}

// ── Typewriter Demo ───────────────────────────────────────────────────────────

const DEMOS = [
  {
    question: 'What were my key takeaways from the system design interview?',
    answer: 'Three points stand out in your notes: design for horizontal scaling from day one, use async queues to decouple services, and check the read/write ratio before picking a database.',
    sources: ['System design interview', 'Scaling notes'],
  },
  {
    question: "Summarize what I've learned about React performance.",
    answer: 'The recurring themes are: memoize expensive work with useMemo, keep renders cheap by moving state down, and code-split anything large that isn’t needed on first paint.',
    sources: ['React perf', 'Bundle size audit'],
  },
  {
    question: 'What product ideas did I brainstorm last week?',
    answer: 'You wrote down three: a habit tracker with gentle AI nudges, a CLI journal with search over past entries, and a browser extension that summarizes articles on hover.',
    sources: ['Ideas — week 43'],
  },
]

function TypewriterDemo() {
  const reducedMotion = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [typedPhase, setPhase] = useState<'typing-q' | 'waiting' | 'typing-a' | 'done'>('typing-q')
  const [typedQ, setQ] = useState('')
  const [typedA, setA] = useState('')
  const current = DEMOS[idx]

  // Reduced motion: show the first exchange complete, with no typing or rotation.
  const phase = reducedMotion ? 'done' : typedPhase
  const q = reducedMotion ? current.question : typedQ
  const a = reducedMotion ? current.answer : typedA
  const answered = phase === 'done' || (phase === 'typing-a' && a.length === current.answer.length)

  useEffect(() => {
    if (phase === 'typing-q') {
      if (q.length < current.question.length) {
        const t = setTimeout(() => setQ(current.question.slice(0, q.length + 1)), 34)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('waiting'), 500)
      return () => clearTimeout(t)
    }
    if (phase === 'waiting') {
      const t = setTimeout(() => setPhase('typing-a'), 800)
      return () => clearTimeout(t)
    }
    if (phase === 'typing-a') {
      if (a.length < current.answer.length) {
        const t = setTimeout(() => setA(current.answer.slice(0, a.length + 1)), 14)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => {
        setIdx(i => (i + 1) % DEMOS.length)
        setQ(''); setA(''); setPhase('typing-q')
      }, 3600)
      return () => clearTimeout(t)
    }
  }, [phase, q, a, current, idx])

  return (
    // Illustration only; the half-typed text would be noise to a screen reader.
    <div
      aria-hidden="true"
      className="w-full max-w-xl rounded-3xl overflow-hidden bg-surface border border-line shadow-[0_0_0_1px_rgba(36,87,255,0.12),0_30px_120px_rgba(36,87,255,0.25)]"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/10" />)}
        </div>
        <div className="flex-1 text-center">
          <span className="inline-block rounded-md px-3 py-1 text-xs text-ink-3 bg-white/4">second-brain.app</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_10px_rgba(200,255,61,0.8)]" />
      </div>

      <div className="p-5 sm:p-6 flex flex-col gap-4 min-h-[260px]">
        {q && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 text-sm leading-relaxed bg-brand text-on-brand">
              {q}{phase === 'typing-q' && <span className="animate-[lp-blink_1s_step-end_infinite]">|</span>}
            </div>
          </div>
        )}

        {phase === 'waiting' && (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            Searching your notes
          </div>
        )}

        {a && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink">
              {a}{phase === 'typing-a' && !answered && <span className="text-accent">|</span>}
            </p>
            <div className={`flex flex-wrap items-center gap-1.5 transition-opacity duration-500 ${answered ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-xs text-ink-3 mr-1">Sources</span>
              {current.sources.map((s, i) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 bg-tint border border-line-2 text-ink">
                  <span className="font-semibold text-accent">{i + 1}</span>{s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 flex items-center justify-between border-t border-line">
        <span className="text-xs text-ink-3">Hybrid search · Claude</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Answers from your notes only
        </span>
      </div>
    </div>
  )
}

// ── Scroll Reveal ─────────────────────────────────────────────────────────────

function useScrollReveal(threshold = 0.15) {
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setVisible] = useState(false)
  // Reduced motion: content is simply there, no slide-in.
  const visible = revealed || reducedMotion
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-ink-2 mb-5">
      <span className="w-6 h-px bg-accent" aria-hidden="true" />
      {children}
    </p>
  )
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// The pair of glossy tiles from the brand board: cobalt = your note, lime = the answer.
function BrandTiles() {
  return (
    <div aria-hidden="true" className="relative h-40 sm:h-48 w-72 sm:w-96 mx-auto">
      <div className="lp-tile lp-tile-cobalt absolute left-4 sm:left-10 top-6 w-28 h-28 sm:w-36 sm:h-36 -rotate-12 animate-[lp-float_7s_ease-in-out_infinite]">
        <span>note</span>
      </div>
      <div className="lp-tile lp-tile-lime absolute right-4 sm:right-10 top-0 w-28 h-28 sm:w-36 sm:h-36 rotate-[9deg] animate-[lp-float_7s_ease-in-out_-3.5s_infinite]">
        <span>answer</span>
      </div>
    </div>
  )
}

interface BentoProps {
  title: string
  body: string
  icon: React.ReactNode
  className?: string
  tone?: 'plain' | 'lime' | 'cobalt'
  children?: React.ReactNode
  delay?: number
}

function Bento({ title, body, icon, className = '', tone = 'plain', children, delay = 0 }: BentoProps) {
  const tones = {
    plain: 'bg-surface border border-line text-ink',
    lime: 'bg-accent text-on-accent',
    cobalt: 'bg-brand text-on-brand',
  }
  const muted = { plain: 'text-ink-2', lime: 'text-on-accent/75', cobalt: 'text-on-brand/85' }
  const iconBox = { plain: 'bg-tint-2 text-accent', lime: 'bg-on-accent/10', cobalt: 'bg-white/15' }
  return (
    <Reveal delay={delay} className={className}>
      <div className={`h-full rounded-3xl p-6 sm:p-7 flex flex-col ${tones[tone]}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-5 ${iconBox[tone]}`}>{icon}</div>
        <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight mb-2">{title}</h3>
        <p className={`text-sm leading-relaxed ${muted[tone]}`}>{body}</p>
        {children}
      </div>
    </Reveal>
  )
}

const icon = (d: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
)

// ── Landing Page ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="scheme-dark min-h-dvh bg-canvas text-ink overflow-x-clip">
      <style>{`
        @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes lp-float { 0%,100%{translate:0 0} 50%{translate:0 -10px} }

        /* Extruded headline: stacked hard shadows in darker shades of the face
           colour fake depth; a soft drop and a glow sit underneath. Sizes in em
           so the depth scales with the type. */
        .lp-extrude-cobalt {
          color: #2457ff;
          text-shadow:
            0 .008em 0 #1f4ce6, 0 .016em 0 #1b43cc, 0 .024em 0 #173ab3,
            0 .032em 0 #133199, 0 .040em 0 #0f2880, 0 .048em 0 #0b1f66,
            0 .09em .08em rgba(0,0,0,.6), 0 0 .5em rgba(${COBALT},.35);
        }
        .lp-extrude-lime {
          color: #c8ff3d;
          text-shadow:
            0 .008em 0 #b6e937, 0 .016em 0 #a3d131, 0 .024em 0 #8fb82b,
            0 .032em 0 #7b9e25, 0 .040em 0 #67851f, 0 .048em 0 #536b19,
            0 .09em .08em rgba(0,0,0,.6), 0 0 .5em rgba(${LIME},.25);
        }

        /* Glossy rounded tiles, after the brand board. */
        .lp-tile {
          border-radius: 28%;
          display: flex; align-items: center; justify-content: center;
          font: 600 .75rem/1 'Inter', system-ui, sans-serif;
          letter-spacing: .08em;
        }
        .lp-tile-cobalt {
          background: radial-gradient(120% 120% at 30% 20%, #4f7bff 0%, #2457ff 45%, #1238c9 100%);
          box-shadow: inset 0 2px 1px rgba(255,255,255,.35), inset 0 -10px 18px rgba(0,0,0,.35),
                      0 24px 50px rgba(${COBALT},.45), 0 6px 12px rgba(0,0,0,.5);
          color: rgba(255,255,255,.85);
        }
        .lp-tile-lime {
          background: radial-gradient(120% 120% at 30% 20%, #e8ff9e 0%, #c8ff3d 45%, #94cc12 100%);
          box-shadow: inset 0 2px 1px rgba(255,255,255,.6), inset 0 -10px 18px rgba(60,80,0,.35),
                      0 24px 50px rgba(${LIME},.35), 0 6px 12px rgba(0,0,0,.5);
          color: rgba(5,6,10,.7);
        }
      `}</style>

      {/* Nav — a floating glass pill */}
      <header className="fixed top-3 inset-x-3 z-50">
        <nav
          aria-label="Main"
          className={`mx-auto max-w-5xl flex items-center justify-between gap-4 rounded-full pl-3 pr-2 py-2 border transition-colors duration-300 backdrop-blur-xl ${
            scrolled ? 'bg-[rgba(13,15,21,0.8)] border-line' : 'bg-[rgba(13,15,21,0.35)] border-transparent'
          }`}
        >
          <Link to="/" className="flex items-center gap-2 rounded-full pr-2">
            <BrandMark />
            <span className="font-display text-base font-extrabold tracking-tight">Second Brain</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {[['How it works', '#how-it-works'], ['Features', '#features'], ['Built with', '#tech-stack']].map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-ink-2 transition-colors hover:text-ink">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Link to="/login" className="hidden sm:inline-block text-sm px-3 py-2 rounded-full text-ink-2 transition-colors hover:text-ink">
              Sign in
            </Link>
            <Link to="/login" className="text-sm font-semibold px-4 py-2 rounded-full bg-accent text-on-accent transition-colors hover:bg-accent-hover">
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative min-h-[min(100dvh,64rem)] flex items-center overflow-hidden">
          <div className="absolute inset-0 opacity-70"><NeuralGrid /></div>
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
            background: `radial-gradient(60% 50% at 50% 35%, rgba(${COBALT},0.22) 0%, transparent 70%),
                         radial-gradient(30% 25% at 70% 80%, rgba(${LIME},0.08) 0%, transparent 70%)`,
          }} />
          <div aria-hidden="true" className="absolute bottom-0 inset-x-0 h-40 pointer-events-none bg-linear-to-b from-transparent to-canvas" />

          <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-28 pb-16 text-center">
            <p className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-8 bg-white/5 border border-line text-ink-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,255,61,0.9)]" aria-hidden="true" />
              Hybrid search · Answers by Claude
            </p>

            <h1 className="font-display font-extrabold leading-[0.8] tracking-[-0.055em] text-[clamp(4.5rem,21vw,12.5rem)]">
              <span className="lp-extrude-cobalt block">second</span>
              <span className="lp-extrude-lime block">brain</span>
            </h1>

            <p className="mt-8 text-xs sm:text-sm uppercase tracking-[0.35em] text-ink-2" aria-label="Capture, ask, remember">
              Capture <span className="text-accent" aria-hidden="true">•</span> Ask <span className="text-accent" aria-hidden="true">•</span> Remember
            </p>

            <p className="mt-6 mx-auto max-w-xl text-base sm:text-lg leading-relaxed text-ink-2">
              Write notes, save articles, then ask questions in plain language.
              Every answer comes from your own notes — and shows you which ones.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 font-display text-base font-bold px-7 py-3.5 rounded-full bg-accent text-on-accent transition-all hover:bg-accent-hover hover:shadow-[0_0_40px_rgba(200,255,61,0.45)]">
                Start for free <Arrow />
              </Link>
              <a href="#demo" className="inline-flex items-center gap-2 text-base px-6 py-3.5 rounded-full border border-line text-ink transition-colors hover:bg-white/5">
                See it answer
              </a>
            </div>

            <div className="mt-16">
              <BrandTiles />
            </div>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="px-4 sm:px-8 py-24 sm:py-32">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-16 items-center">
            <Reveal>
              <Eyebrow>Ask</Eyebrow>
              <h2 className="font-display font-extrabold tracking-[-0.04em] leading-[0.95] text-[clamp(2.5rem,6vw,4.5rem)]">
                It answers from <span className="text-accent">your</span> notes.
              </h2>
              <ul className="mt-8 space-y-4 text-ink-2">
                {[
                  'Finds notes by meaning and by exact words — names, acronyms, error codes.',
                  'Shows the notes behind every answer, so you can check them.',
                  'Says so when your notes don’t cover the question, instead of guessing.',
                ].map(t => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-1 w-5 h-5 shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center" aria-hidden="true">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={150} className="flex justify-center lg:justify-end">
              <TypewriterDemo />
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="px-4 sm:px-8 py-24 sm:py-32 border-t border-line">
          <div className="max-w-6xl mx-auto">
            <Reveal className="mb-14">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="font-display font-extrabold tracking-[-0.04em] leading-[0.95] text-[clamp(2.5rem,6vw,4.5rem)]">
                Three steps. <span className="text-brand-ink">No filing.</span>
              </h2>
            </Reveal>
            <ol className="grid md:grid-cols-3 gap-4">
              {[
                ['Capture anything', 'Write a note, paste text, or import a web page. Spaces keep topics apart.'],
                ['It gets indexed', 'Each note is split into passages and indexed by meaning and by keyword — automatically, on every save.'],
                ['Ask in plain words', 'The best passages from your notes go to Claude, which answers from them and cites each one.'],
              ].map(([title, body], i) => (
                <li key={title}>
                  <Reveal delay={i * 120} className="h-full">
                    <div className="h-full rounded-3xl p-6 sm:p-7 bg-surface border border-line">
                      <span
                        aria-hidden="true"
                        className="block font-display font-extrabold text-7xl leading-none tracking-tighter text-transparent [-webkit-text-stroke:1.5px_var(--brand-ink)] mb-6"
                      >
                        0{i + 1}
                      </span>
                      <h3 className="font-display text-2xl font-extrabold tracking-tight mb-2">{title}</h3>
                      <p className="text-sm leading-relaxed text-ink-2">{body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features — bento */}
        <section id="features" className="px-4 sm:px-8 py-24 sm:py-32 border-t border-line">
          <div className="max-w-6xl mx-auto">
            <Reveal className="mb-14">
              <Eyebrow>Features</Eyebrow>
              <h2 className="font-display font-extrabold tracking-[-0.04em] leading-[0.95] text-[clamp(2.5rem,6vw,4.5rem)]">
                Built for how you<br className="hidden sm:block" /> actually remember.
              </h2>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Bento
                tone="lime"
                className="md:col-span-4"
                title="Answers you can check"
                body="Every answer lists the notes it came from. Open one to read the full passage — nothing is taken on faith."
                icon={icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />)}
              >
                <div aria-hidden="true" className="mt-6 flex flex-wrap gap-2">
                  {['System design interview', 'Scaling notes', 'Queue patterns'].map((s, i) => (
                    <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 bg-on-accent text-accent">
                      <span className="font-bold">{i + 1}</span>
                      <span className="text-ink">{s}</span>
                    </span>
                  ))}
                </div>
              </Bento>
              <Bento
                tone="cobalt"
                delay={80}
                className="md:col-span-2"
                title="Hybrid search"
                body="Meaning and exact words, ranked together. Finds “CrashLoopBackOff” even when the vibe doesn’t match."
                icon={icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)}
              />
              <Bento
                delay={0}
                className="md:col-span-2"
                title="Import any page"
                body="Paste a link; the article text becomes a note you can search and ask about."
                icon={icon(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>)}
              />
              <Bento
                delay={80}
                className="md:col-span-2"
                title="Spaces"
                body="Keep work, study and side projects apart. Chat only searches the space you’re in."
                icon={icon(<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />)}
              />
              <Bento
                delay={160}
                className="md:col-span-2"
                title="Always current"
                body="Edit a note and it’s re-indexed on save. Each note shows whether search can find it yet."
                icon={icon(<><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>)}
              />
              <Bento
                delay={0}
                className="md:col-span-3"
                title="Private by design"
                body="AI calls run server-side, keys never reach the browser, and row-level security keeps every account’s notes apart."
                icon={icon(<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>)}
              />
              <Bento
                delay={80}
                className="md:col-span-3"
                title="Any screen, light or dark"
                body="Follows your system appearance and works on your phone, with keyboard and screen-reader support throughout."
                icon={icon(<><rect x="2" y="4" width="14" height="12" rx="2" /><rect x="17" y="8" width="5" height="12" rx="1" /></>)}
              />
            </div>
          </div>
        </section>

        {/* Tech stack */}
        <section id="tech-stack" className="px-4 sm:px-8 py-20 border-t border-line">
          <Reveal className="max-w-5xl mx-auto text-center">
            <Eyebrow>Built with</Eyebrow>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {[
                { label: 'React + TypeScript', color: '#61dafb' },
                { label: 'Supabase', color: '#3ecf8e' },
                { label: 'pgvector', color: '#6b9bd1' },
                { label: 'Voyage AI', color: '#a78bfa' },
                { label: 'Claude', color: '#d97757' },
                { label: 'Edge Functions', color: '#c8ff3d' },
                { label: 'Tailwind CSS v4', color: '#38bdf8' },
                { label: 'Netlify', color: '#00c7b7' },
              ].map(({ label, color }) => (
                // Static labels, not controls. Brand colour sits in a dot, not the text.
                <span key={label} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full text-ink-2 bg-surface border border-line">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        {/* CTA — a lime slab */}
        <section className="px-3 sm:px-6 pb-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-accent text-on-accent px-6 sm:px-12 py-16 sm:py-24 text-center">
              <h2 className="relative font-display font-extrabold tracking-[-0.05em] leading-[0.9] text-[clamp(2.75rem,8vw,6.5rem)]">
                Give your notes<br />a second brain.
              </h2>
              <p className="relative mt-6 text-base sm:text-lg text-on-accent/75">
                Free to start. Your first answer is one note away.
              </p>
              <Link to="/login" className="relative mt-10 inline-flex items-center gap-2 font-display text-base font-bold px-8 py-4 rounded-full bg-on-accent text-accent transition-transform hover:-translate-y-0.5">
                Start for free <Arrow />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="px-4 sm:px-8 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span className="font-display font-extrabold tracking-tight">Second Brain</span>
          </div>
          <p className="text-xs text-ink-3">Built by Michael · {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
