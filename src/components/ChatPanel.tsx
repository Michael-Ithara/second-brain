import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useChat } from '../hooks/useChat'

interface Props {
  spaceId: string
}

export function ChatPanel({ spaceId }: Props) {
  const { messages, loading, sendMessage, clearMessages } = useChat(spaceId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    <div className="flex flex-col h-full" style={{ background: '#0d0d10' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="text-sm font-medium" style={{ color: '#f0ede8', fontFamily: 'Instrument Serif, serif', fontSize: '0.95rem' }}>
          Ask your notes
        </h3>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs transition-colors"
            style={{ color: '#3a3a4a' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6a6a7a')}
            onMouseLeave={e => (e.currentTarget.style.color = '#3a3a4a')}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#3a3a4a' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium mb-1" style={{ color: '#4a4a5a' }}>Ask your notes</p>
              <p className="text-xs leading-relaxed" style={{ color: '#2a2a3a' }}>
                Ask anything and I'll search your notes to answer.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
              style={msg.role === 'user' ? {
                background: 'rgba(255,255,255,0.08)',
                color: '#f0ede8',
              } : {
                background: 'transparent',
                color: '#8a8a9a',
                padding: '0',
              }}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm" style={{ color: '#8a8a9a' }}>
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ color: '#8a8a9a', marginBottom: '0.5rem', lineHeight: '1.6' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ color: '#c0c0d0', fontWeight: 600 }}>{children}</strong>,
                      ul: ({ children }) => <ul style={{ color: '#8a8a9a', paddingLeft: '1rem', marginBottom: '0.5rem' }}>{children}</ul>,
                      li: ({ children }) => <li style={{ color: '#8a8a9a', marginBottom: '0.25rem' }}>{children}</li>,
                      code: ({ children }) => <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem', color: '#c0c0d0' }}>{children}</code>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 px-1 py-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#3a3a4a',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={2}
            className="flex-1 text-sm outline-none resize-none rounded-xl px-3.5 py-2.5 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0ede8',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="text-xs font-medium px-3.5 py-2.5 rounded-xl transition-all shrink-0"
            style={{
              background: input.trim() ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.05)',
              color: input.trim() ? '#0f0f0f' : '#3a3a4a',
              cursor: input.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Ask
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: '#2a2a3a' }}>⌘ + Enter to send</p>
      </div>
    </div>
  )
}