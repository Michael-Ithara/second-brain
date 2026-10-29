import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../hooks/useChat'
import type { Message, Source } from '../hooks/useChat'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useToast } from '../lib/toast'

interface Props {
  spaceId: string
  onOpenNote: (id: string) => void
  // Starter questions built from this space's notes; empty when there are none.
  suggestions: string[]
}

function SourceList({ sources, onOpenNote }: { sources: Source[]; onOpenNote: (id: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (sources.length === 0) {
    return (
      <p className="text-xs mt-1 text-ink-2">
        No matching notes. This answer isn't based on your notes.
      </p>
    )
  }

  const open = sources.find(s => s.id === openId)

  return (
    <div className="mt-1">
      <p className="text-xs mb-1.5 text-ink-2">
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((source, i) => (
          <button
            key={source.id}
            onClick={() => setOpenId(openId === source.id ? null : source.id)}
            aria-expanded={openId === source.id}
            className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 max-w-full transition-colors text-ink border border-line-2 hover:bg-tint-2 ${
              openId === source.id ? 'bg-tint-2' : 'bg-tint'
            }`}
          >
            <span className="text-accent-ink">{i + 1}</span>
            <span className="truncate">{source.title || 'Untitled note'}</span>
          </button>
        ))}
      </div>
      {open && (
        <div className="mt-2 rounded-lg px-3 py-2 bg-tint border border-line">
          <p className="text-xs leading-relaxed line-clamp-6 text-ink-2">
            {open.content}
          </p>
          <button
            onClick={() => onOpenNote(open.id)}
            className="text-xs mt-1.5 rounded text-accent-ink hover:text-accent-ink-hover hover:underline"
          >
            Open note
          </button>
        </div>
      )}
    </div>
  )
}

// Turn the model's "[2]" into a link the Markdown renderer hands to our `a`
// component — but only for numbers that match a real source, and never for
// real Markdown links ("[2](https://…)").
function linkCitations(text: string, count: number) {
  return text.replace(/\[(\d{1,2})\](?!\()/g, (match, n) =>
    Number(n) >= 1 && Number(n) <= count ? `[${n}](#cite-${n})` : match)
}

interface AnswerProps {
  msg: Message
  isLast: boolean
  onOpenNote: (id: string) => void
  onRetry: () => void
}

function Answer({ msg, isLast, onOpenNote, onRetry }: AnswerProps) {
  const toast = useToast()
  const sources = msg.sources ?? []
  const streaming = msg.status === 'streaming'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.content)
      toast({ message: 'Answer copied' })
    } catch {
      toast({ tone: 'error', message: 'Couldn’t copy — your browser blocked it.' })
    }
  }

  // Waiting for the first words: retrieval, then the model's first token.
  if (streaming && !msg.content) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-ink-3">
        <div className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent-ink animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        {msg.sources ? `Reading ${sources.length} ${sources.length === 1 ? 'note' : 'notes'}…` : 'Searching your notes…'}
      </div>
    )
  }

  if (msg.status === 'error' && !msg.content) {
    return (
      <div className="flex items-center gap-3 text-sm text-ink-2">
        <span>Something went wrong.</span>
        {isLast && <button onClick={onRetry} className="text-sm font-medium rounded text-accent-ink hover:underline">Try again</button>}
      </div>
    )
  }

  return (
    <div className="text-sm leading-relaxed text-ink">
      <span className="sr-only">Answer: </span>
      {/* While streaming, the cursor is drawn after the last block (see .answer-streaming in index.css),
          so it sits at the end of the text instead of on a line of its own. */}
      <div className={streaming ? 'answer-streaming' : undefined}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="text-ink mb-2 leading-[1.65]">{children}</p>,
          strong: ({ children }) => <strong className="text-ink font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="text-ink pl-4 mb-2 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="text-ink pl-4 mb-2 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="text-ink mb-1">{children}</li>,
          code: ({ children }) => (
            <code className="font-mono text-[0.78rem] text-accent-ink rounded px-[0.35rem] py-[0.1rem] bg-tint-2 border border-line-2">
              {children}
            </code>
          ),
          a: ({ href, children }) => {
            const n = href?.startsWith('#cite-') ? Number(href.slice(6)) : 0
            const source = n ? sources[n - 1] : undefined
            if (source) {
              const title = source.title || 'Untitled note'
              return (
                <button
                  type="button"
                  onClick={() => onOpenNote(source.id)}
                  title={title}
                  aria-label={`Source ${n}: ${title}`}
                  className="inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 mx-0.5 align-[0.12em] rounded text-[0.65rem] font-bold leading-none bg-tint-2 text-accent-ink border border-line-2 transition-colors hover:bg-accent hover:text-on-accent hover:border-transparent"
                >
                  {n}
                </button>
              )
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">{children}</a>
          },
        }}
      >
        {linkCitations(msg.content, sources.length)}
      </ReactMarkdown>
      </div>

      {!streaming && (
        <>
          {msg.status === 'stopped' && <p className="text-xs text-ink-3 mb-2">Stopped.</p>}
          {msg.status === 'truncated' && <p className="text-xs text-ink-3 mb-2">The answer hit the length limit and was cut off.</p>}
          {msg.status === 'error' && <p className="text-xs text-danger mb-2">The answer stopped part-way.</p>}

          {msg.sources && <SourceList sources={sources} onOpenNote={onOpenNote} />}

          <div className="flex items-center gap-1 mt-2 -ml-2">
            <button onClick={copy} className="flex items-center gap-1.5 text-xs px-2 py-1 pointer-coarse:py-2 rounded-md text-ink-3 transition-colors hover:text-ink hover:bg-tint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </button>
            {isLast && (
              <button onClick={onRetry} className="flex items-center gap-1.5 text-xs px-2 py-1 pointer-coarse:py-2 rounded-md text-ink-3 transition-colors hover:text-ink hover:bg-tint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Retry
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function ChatPanel({ spaceId, onOpenNote, suggestions }: Props) {
  const { messages, loading, sendMessage, retryLast, stop, clearMessages } = useChat(spaceId)
  const [input, setInput] = useState('')
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // Follow the answer as it streams — unless the reader has scrolled up to
  // re-read something, in which case leave them there.
  const stickToBottom = useRef(true)
  // On phones the return key should add a line; there's a button to send.
  const touch = useMediaQuery('(pointer: coarse)')

  useEffect(() => {
    const log = logRef.current
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight
  }, [messages])

  const onScroll = () => {
    const log = logRef.current
    if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80
  }

  // Grow the composer with its text, up to about six lines.
  const resize = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const ask = (question: string) => {
    if (!question.trim() || loading) return
    stickToBottom.current = true
    sendMessage(question.trim())
  }

  const handleSend = () => {
    if (!input.trim() || loading) return
    ask(input)
    setInput('')
    requestAnimationFrame(resize)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // isComposing: an Enter that confirms an IME candidate (Japanese, Chinese…) must not send.
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <section aria-labelledby="chat-heading" className="flex flex-col h-full bg-canvas">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center bg-tint-2 border border-line-2 text-accent-ink">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 id="chat-heading" className="font-display text-sm font-semibold text-ink">
            Ask your notes
          </h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs px-2 py-1 -mr-2 rounded-md transition-colors duration-200 text-ink-2 hover:text-ink"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages. aria-busy holds screen-reader announcements until an answer
          has finished streaming, so it's read once, not token by token. */}
      <div
        ref={logRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-busy={loading}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
      >
        {/* Empty state, with starter questions from this space's notes */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-tint-2 border border-line-2 text-accent-ink">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-display text-sm font-semibold mb-1 text-ink">Ask your notes</p>
              <p className="text-xs leading-relaxed text-ink-3">
                {suggestions.length > 0
                  ? 'Answers come from this space, with the notes they used.'
                  : 'Add a note first — then ask anything about it.'}
              </p>
            </div>
            {suggestions.length > 0 && (
              <div className="w-full flex flex-col gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="w-full text-left text-sm px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink-2 transition-colors hover:text-ink hover:border-line-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[88%] rounded-xl rounded-tr-md text-sm leading-relaxed bg-brand text-on-brand px-3.5 py-2.5 whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="max-w-[94%]">
              <Answer msg={msg} isLast={i === messages.length - 1} onOpenNote={onOpenNote} onRetry={retryLast} />
            </div>
          )
        )}
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-line">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); resize() }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            aria-label="Question"
            aria-describedby={touch ? undefined : 'chat-hint'}
            rows={1}
            className="flex-1 text-sm resize-none rounded-xl px-3.5 py-2.5 max-h-40 transition-colors duration-200 bg-surface border border-field text-ink placeholder:text-ink-3 focus:border-ring focus-visible:outline-none"
          />
          {loading ? (
            <button
              key="stop"
              onClick={stop}
              aria-label="Stop answering"
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-ink text-canvas transition-opacity hover:opacity-85"
            >
              <span className="w-3 h-3 rounded-[3px] bg-current" aria-hidden="true" />
            </button>
          ) : (
            // Separate keys so React swaps elements instead of animating one button's colours.
            <button
              key="ask"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 h-10 font-display text-xs font-semibold px-4 rounded-xl transition-colors duration-200 bg-accent text-on-accent shadow-edge hover:bg-accent-hover disabled:bg-tint disabled:text-ink-3 disabled:shadow-none disabled:cursor-not-allowed"
            >
              Ask
            </button>
          )}
        </div>
        {!touch && (
          <p id="chat-hint" className="text-xs mt-2 text-ink-3">
            Enter to send · Shift + Enter for a new line
          </p>
        )}
      </div>
    </section>
  )
}
