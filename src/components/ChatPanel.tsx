import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../hooks/useChat'
import type { Source } from '../hooks/useChat'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { modKey } from '../lib/platform'

interface Props {
  spaceId: string
  onOpenNote: (id: string) => void
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
            <span className="text-accent">{i + 1}</span>
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
            className="text-xs mt-1.5 rounded text-accent hover:text-accent-hover hover:underline"
          >
            Open note
          </button>
        </div>
      )}
    </div>
  )
}

export function ChatPanel({ spaceId, onOpenNote }: Props) {
  const { messages, loading, sendMessage, clearMessages } = useChat(spaceId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [messages, reducedMotion])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    await sendMessage(question)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend()
  }

  return (
    <section aria-labelledby="chat-heading" className="flex flex-col h-full bg-canvas">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center bg-tint-2 border border-line-2 text-accent"
          >
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

      {/* Messages. role="log" makes screen readers announce new answers as they arrive. */}
      <div role="log" aria-live="polite" className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-tint-2 border border-line-2 text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="font-display text-xs font-medium mb-1 text-ink-2">
                Ask your notes
              </p>
              <p className="text-xs leading-relaxed text-ink-3">
                Ask anything and I'll search your notes to answer.
              </p>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-tint-2 border border-line-2 text-ink px-3.5 py-2.5'
                  : 'text-ink'
              }`}
            >
              {msg.role === 'assistant' ? (
                <>
                <span className="sr-only">Answer: </span>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="text-ink mb-2 leading-[1.65]">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-white font-semibold">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="text-ink pl-4 mb-2 list-disc">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-ink mb-1">{children}</li>
                    ),
                    code: ({ children }) => (
                      <code className="font-mono text-[0.78rem] text-accent rounded px-[0.35rem] py-[0.1rem] bg-tint-2 border border-line-2">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                {msg.sources && <SourceList sources={msg.sources} onOpenNote={onOpenNote} />}
                </>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div role="status" className="flex justify-start">
            <span className="sr-only">Searching your notes</span>
            <div className="flex gap-1 py-2" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-line">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            aria-label="Question"
            aria-describedby="chat-hint"
            rows={2}
            className="flex-1 text-sm resize-none rounded-xl px-3.5 py-2.5 transition-colors duration-200 bg-surface border border-field text-ink placeholder:text-ink-3 focus:border-accent focus-visible:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="font-display text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors duration-200 shrink-0 bg-accent text-on-accent hover:bg-accent-hover disabled:bg-tint disabled:text-ink-3 disabled:cursor-not-allowed"
          >
            Ask
          </button>
        </div>
        <p id="chat-hint" className="text-xs mt-2 text-ink-3">
          {modKey} + Enter to send
        </p>
      </div>

    </section>
  )
}
