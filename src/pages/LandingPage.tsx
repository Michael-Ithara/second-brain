import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'

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

function NeuralGrid() {
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
      const count = Math.max(Math.floor((canvas.width * canvas.height) / 14000), 12)
      stateRef.current.nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 2 + 1,
        pulsePhase: Math.random() * Math.PI * 2,
        glowing: Math.random() > 0.7,
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
      ctx.strokeStyle = 'rgba(79,156,249,0.04)'
      ctx.lineWidth = 1
      const gs = 60
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
            ctx.strokeStyle = `rgba(79,156,249,${(1 - dist / 140) * 0.18})`
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
        const g = ctx.createRadialGradient(px, py, 0, px, py, 8)
        g.addColorStop(0, 'rgba(79,156,249,0.9)')
        g.addColorStop(0.4, 'rgba(79,156,249,0.3)')
        g.addColorStop(1, 'rgba(79,156,249,0)')
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2)
        ctx.fillStyle = g; ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fillStyle = '#a8d4ff'; ctx.fill()
        return true
      })

      // Nodes
      nodes.forEach(p => {
        const pulse = Math.sin(p.pulsePhase) * 0.4 + 0.6
        const near = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2) < 100
        if (p.glowing || near) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16)
          g.addColorStop(0, `rgba(79,156,249,${0.4 * pulse})`)
          g.addColorStop(1, 'rgba(79,156,249,0)')
          ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2)
          ctx.fillStyle = g; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = near ? `rgba(168,212,255,${pulse})` : `rgba(79,156,249,${0.5 * pulse})`
        ctx.fill()
      })

      if (frame % 90 === 0) spawnPulse()
      animId = requestAnimationFrame(draw)
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onMouseLeave = () => { mouseRef.current = { x: -999, y: -999 } }

    resize()
    draw()
    window.addEventListener('resize', resize)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

// ── Typewriter Demo ───────────────────────────────────────────────────────────

const DEMOS = [
  {
    question: "What were my key takeaways from the system design interview?",
    answer: "Your notes highlight three main points: design for horizontal scaling from day one, use async queues to decouple services, and always clarify read vs write ratios before picking a database.",
  },
  {
    question: "Summarize everything I've learned about React performance.",
    answer: "Across your notes, the recurring themes are: memoize expensive computations with useMemo, avoid anonymous functions in JSX renders, and prefer code-splitting for large bundles.",
  },
  {
    question: "What product ideas did I brainstorm last week?",
    answer: "You noted three concepts: a habit tracker with AI nudges, a CLI tool for daily journaling with vector search, and a browser extension that summarizes articles on hover.",
  },
]

function TypewriterDemo() {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'typing-q' | 'waiting' | 'typing-a'>('typing-q')
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const current = DEMOS[idx]

  useEffect(() => { setQ(''); setA(''); setPhase('typing-q') }, [idx])

  useEffect(() => {
    if (phase === 'typing-q') {
      if (q.length < current.question.length) {
        const t = setTimeout(() => setQ(current.question.slice(0, q.length + 1)), 38)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setPhase('waiting'), 500)
      return () => clearTimeout(t)
    }
    if (phase === 'waiting') {
      const t = setTimeout(() => setPhase('typing-a'), 700)
      return () => clearTimeout(t)
    }
    if (phase === 'typing-a') {
      if (a.length < current.answer.length) {
        const t = setTimeout(() => setA(current.answer.slice(0, a.length + 1)), 16)
        return () => clearTimeout(t)
      }
      const t = setTimeout(() => setIdx(i => (i + 1) % DEMOS.length), 3200)
      return () => clearTimeout(t)
    }
  }, [phase, q, a, current, idx])

  return (
    <div className="rounded-2xl overflow-hidden w-full max-w-lg" style={{
      background: 'rgba(10,15,28,0.97)',
      border: '1px solid rgba(79,156,249,0.2)',
      boxShadow: '0 0 80px rgba(79,156,249,0.08), 0 0 0 1px rgba(79,156,249,0.05)',
    }}>
      {/* Chrome */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(79,156,249,0.1)', background: 'rgba(79,156,249,0.03)' }}>
        <div className="flex gap-1.5">
          {(['#ff5f57','#ffbd2e','#28c840'] as const).map((c,i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: 0.5 }} />
          ))}
        </div>
        <div className="flex-1 mx-3">
          <div className="rounded px-3 py-1 text-xs text-center" style={{ background: 'rgba(255,255,255,0.04)', color: '#475569', maxWidth: '180px', margin: '0 auto' }}>
            second-brain.app
          </div>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ background: '#4f9cf9', boxShadow: '0 0 6px #4f9cf9', animation: 'pulse 2s ease-in-out infinite' }} />
      </div>

      <div className="p-5 flex flex-col gap-4" style={{ minHeight: '200px' }}>
        {q && (
          <div className="flex justify-end">
            <div className="max-w-xs rounded-xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed" style={{
              background: 'rgba(79,156,249,0.12)',
              border: '1px solid rgba(79,156,249,0.2)',
              color: '#e2e8f0',
            }}>
              {q}{phase === 'typing-q' && <span style={{ color: '#4f9cf9', animation: 'blink 1s step-end infinite' }}>|</span>}
            </div>
          </div>
        )}
        {phase === 'waiting' && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#4f9cf9' }} />
            </div>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f9cf9', opacity: 0.6, animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        {a && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#4f9cf9' }} />
            </div>
            <div className="text-sm leading-relaxed flex-1" style={{ color: '#94a3b8' }}>
              {a}{phase === 'typing-a' && <span style={{ color: '#4f9cf9' }}>|</span>}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: '1px solid rgba(79,156,249,0.08)', background: 'rgba(79,156,249,0.02)' }}>
        <span className="text-xs" style={{ color: '#334155' }}>RAG · pgvector · Claude</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#48bb78' }} />
          <span className="text-xs" style={{ color: '#334155' }}>AI connected</span>
        </div>
      </div>
    </div>
  )
}

// ── Scroll Reveal ─────────────────────────────────────────────────────────────

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
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

// ── Feature Card ──────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  const { ref, visible } = useScrollReveal()
  const [hovered, setHovered] = useState(false)
  return (
    <div
      ref={ref}
      className="rounded-2xl p-6 transition-all duration-500 cursor-default"
      style={{
        background: hovered ? 'rgba(79,156,249,0.05)' : 'rgba(255,255,255,0.02)',
        border: hovered ? '1px solid rgba(79,156,249,0.25)' : '1px solid rgba(255,255,255,0.06)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
        transitionDelay: `${delay}ms`,
        boxShadow: hovered ? '0 0 40px rgba(79,156,249,0.06)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300" style={{
        background: hovered ? 'rgba(79,156,249,0.2)' : 'rgba(79,156,249,0.08)',
        color: '#4f9cf9',
        boxShadow: hovered ? '0 0 20px rgba(79,156,249,0.2)' : 'none',
      }}>
        {icon}
      </div>
      <h3 className="font-semibold mb-2" style={{ color: '#e2e8f0', fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{description}</p>
    </div>
  )
}

// ── Step ──────────────────────────────────────────────────────────────────────

interface StepProps { number: string; title: string; description: string; delay: number }

function Step({ number, title, description, delay }: StepProps) {
  const { ref, visible } = useScrollReveal()
  return (
    <div ref={ref} className="transition-all duration-700" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transitionDelay: `${delay}ms`,
    }}>
      <div className="text-xs font-bold mb-4 inline-flex items-center justify-center w-8 h-8 rounded-full" style={{
        background: 'rgba(79,156,249,0.1)',
        border: '1px solid rgba(79,156,249,0.25)',
        color: '#4f9cf9',
      }}>
        {number}
      </div>
      <h3 className="font-semibold mb-2" style={{ color: '#e2e8f0', fontSize: '1rem', letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{description}</p>
    </div>
  )
}

// ── Stat Pill ─────────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <span className="font-bold text-xl" style={{ color: '#4f9cf9', letterSpacing: '-0.03em', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{value}</span>
      <span className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</span>
    </div>
  )
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const { ref: howRef, visible: howVisible } = useScrollReveal()
  const { ref: techRef, visible: techVisible } = useScrollReveal()
  const [scrollY, setScrollY] = useState(0)
  const onScroll = useCallback(() => setScrollY(window.scrollY), [])

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [onScroll])

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
        body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        * { scrollbar-width: thin; scrollbar-color: rgba(79,156,249,0.15) transparent; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(79,156,249,0.15); border-radius: 999px; }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4" style={{
        background: scrollY > 40 ? 'rgba(8,12,20,0.92)' : 'transparent',
        backdropFilter: scrollY > 40 ? 'blur(16px)' : 'none',
        borderBottom: scrollY > 40 ? '1px solid rgba(79,156,249,0.08)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f9cf9" strokeWidth="2">
              <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44l-3.5-13A2.5 2.5 0 0 1 5.97 2H9.5z"/>
              <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44l3.5-13A2.5 2.5 0 0 0 18.03 2H14.5z"/>
            </svg>
          </div>
          <span className="display font-semibold text-sm" style={{ color: '#e2e8f0' }}>Second Brain</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {[['How it works', '#how-it-works'], ['Features', '#features'], ['Tech stack', '#tech-stack']].map(([label, href]) => (
            <a key={label} href={href} className="text-sm transition-colors duration-200" style={{ color: '#64748b' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
            >{label}</a>
          ))}
        </div>

        <Link to="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200" style={{ background: 'rgba(79,156,249,0.12)', color: '#4f9cf9', border: '1px solid rgba(79,156,249,0.25)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,156,249,0.2)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(79,156,249,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,156,249,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          Get started →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <NeuralGrid />

        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(79,156,249,0.07) 0%, transparent 65%)',
          transform: `translateY(${scrollY * 0.15}px)`,
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, #080c14)' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center pt-24"
          style={{ transform: `translateY(${-scrollY * 0.12}px)` }}
        >
          <div>
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full mb-8" style={{ background: 'rgba(79,156,249,0.08)', border: '1px solid rgba(79,156,249,0.18)', color: '#4f9cf9' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4f9cf9', boxShadow: '0 0 6px #4f9cf9', animation: 'pulse 2s ease-in-out infinite' }} />
              Powered by Claude + Voyage AI
            </div>

            <h1 className="display mb-6" style={{ fontSize: 'clamp(2.8rem, 5.5vw, 4.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em', fontWeight: 700, color: '#f1f5f9' }}>
              Your knowledge,{' '}
              <span style={{ color: '#4f9cf9', textShadow: '0 0 40px rgba(79,156,249,0.4)' }}>
                finally alive.
              </span>
            </h1>

            <p className="text-base leading-relaxed mb-10" style={{ color: '#64748b', maxWidth: '420px', fontSize: '1.05rem' }}>
              Capture notes, import articles, and chat with your entire knowledge base in natural language. Second Brain makes your scattered thoughts queryable, connected, and intelligent.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all duration-200 display" style={{ background: '#4f9cf9', color: '#080c14' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#6baeff'; e.currentTarget.style.boxShadow = '0 0 32px rgba(79,156,249,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#4f9cf9'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Start for free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <a href="#how-it-works" className="text-sm transition-colors duration-200" style={{ color: '#475569' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
                onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
              >
                See how it works ↓
              </a>
            </div>

            <div className="flex gap-4 mt-12 flex-wrap">
              <StatPill value="RAG" label="Architecture" />
              <StatPill value="512d" label="Vector Search" />
              <StatPill value="&lt;1s" label="Query Time" />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end" style={{ animation: 'float 6s ease-in-out infinite' }}>
            <TypewriterDemo />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-32 px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <div ref={howRef} className="mb-16 transition-all duration-700" style={{ opacity: howVisible ? 1 : 0, transform: howVisible ? 'translateY(0)' : 'translateY(24px)' }}>
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: '#4f9cf9', letterSpacing: '0.15em' }}>How it works</p>
            <h2 className="display" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', color: '#f1f5f9', letterSpacing: '-0.02em', fontWeight: 700 }}>
              Three steps to a smarter<br />knowledge base
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step number="01" title="Capture anything" description="Write notes directly, paste text, or import any URL. Second Brain scrapes and stores the content instantly." delay={0} />
            <Step number="02" title="Automatic embedding" description="Every note is silently converted into a 512-dimensional vector — a mathematical fingerprint of its meaning stored in Postgres." delay={150} />
            <Step number="03" title="Ask in plain English" description="Your question is embedded and matched via cosine similarity. Claude answers using only what you've written — no hallucinations." delay={300} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: '#4f9cf9', letterSpacing: '0.15em' }}>Features</p>
            <h2 className="display" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', color: '#f1f5f9', letterSpacing: '-0.02em', fontWeight: 700 }}>
              Built for how knowledge actually works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard delay={0} title="Semantic Search"
              description="Finds notes by meaning, not keywords. Surface relevant content even when exact words don't match."
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>}
            />
            <FeatureCard delay={100} title="URL Import"
              description="Paste any article link and Second Brain scrapes, extracts, and embeds the full content automatically."
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
            />
            <FeatureCard delay={200} title="Spaces"
              description="Organize knowledge into focused collections. Each space has isolated notes, embeddings, and chat context."
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/></svg>}
            />
            <FeatureCard delay={300} title="Grounded Answers"
              description="Claude only answers from your notes — zero hallucinations. Every response cites which notes it used."
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
            />
            <FeatureCard delay={400} title="Real-time Sync"
              description="Notes are embedded in the background on save. Your knowledge base is always current without manual steps."
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
            />
            <FeatureCard delay={500} title="Secure by Design"
              description="All AI logic runs in Edge Functions. API keys never reach the browser. RLS policies isolate every user's data."
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
            />
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section id="tech-stack" className="py-24 px-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div ref={techRef} className="max-w-5xl mx-auto transition-all duration-700" style={{ opacity: techVisible ? 1 : 0, transform: techVisible ? 'translateY(0)' : 'translateY(24px)' }}>
          <p className="text-xs font-medium tracking-widest uppercase mb-8 text-center" style={{ color: '#4f9cf9', letterSpacing: '0.15em' }}>Built with</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'React + TypeScript', color: '#61dafb' },
              { label: 'Supabase', color: '#3ecf8e' },
              { label: 'pgvector', color: '#336791' },
              { label: 'Voyage AI', color: '#a78bfa' },
              { label: 'Claude (Anthropic)', color: '#d97757' },
              { label: 'Edge Functions', color: '#4f9cf9' },
              { label: 'Tailwind CSS v4', color: '#38bdf8' },
              { label: 'Netlify', color: '#00c7b7' },
            ].map(({ label, color }) => (
              <span key={label} className="text-sm px-4 py-2 rounded-full transition-all duration-200 cursor-default" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.color = color; e.currentTarget.style.background = `${color}10` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-40 px-8 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(79,156,249,0.08) 0%, transparent 65%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(79,156,249,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,156,249,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="display mb-6" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1.1, fontWeight: 700 }}>
            Your notes deserve to be more than a graveyard.
          </h2>
          <p className="text-base mb-10" style={{ color: '#475569' }}>
            Start building a knowledge base that actually talks back.
          </p>
          <Link to="/login" className="display inline-flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-xl transition-all duration-200" style={{ background: '#4f9cf9', color: '#080c14' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#6baeff'; e.currentTarget.style.boxShadow = '0 0 40px rgba(79,156,249,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#4f9cf9'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Get started for free
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
          <footer className="px-8 py-8" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <span className="display text-sm font-semibold" style={{ color: '#4f9cf9', textShadow: '0 0 20px rgba(79,156,249,0.5)' }}>
                      Second Brain
                  </span>
                  <p className="text-xs" style={{ color: '#475569' }}>
                      Built by Michael · {new Date().getFullYear()}
                  </p>
              </div>
          </footer>
    </div>
  )
}