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
    <div className="flex flex-col h-full" style={{ background: '#080c14' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid rgba(79,156,249,0.08)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(79,156,249,0.15)', border: '1px solid rgba(79,156,249,0.3)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4f9cf9" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3
            className="text-sm font-semibold"
            style={{
              color: '#e2e8f0',
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
            }}
          >
            Ask your notes
          </h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs transition-colors duration-200"
            style={{ color: '#1e3a5f', fontFamily: "'Inter', system-ui, sans-serif" }}
            onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={e => (e.currentTarget.style.color = '#1e3a5f')}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(79,156,249,0.08)', border: '1px solid rgba(79,156,249,0.15)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f9cf9" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="text-center">
              <p
                className="text-xs font-medium mb-1"
                style={{ color: '#475569', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Ask your notes
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: '#1e3a5f', fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Ask anything and I'll search your notes to answer.
              </p>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[88%] rounded-xl text-sm leading-relaxed"
              style={msg.role === 'user' ? {
                background: 'rgba(79,156,249,0.1)',
                border: '1px solid rgba(79,156,249,0.2)',
                color: '#e2e8f0',
                padding: '0.625rem 0.875rem',
                fontFamily: "'Inter', system-ui, sans-serif",
              } : {
                background: 'transparent',
                color: '#64748b',
                padding: '0',
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p style={{ color: '#64748b', marginBottom: '0.5rem', lineHeight: '1.65', fontFamily: "'Inter', system-ui, sans-serif" }}>
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong style={{ color: '#94a3b8', fontWeight: 600 }}>{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul style={{ color: '#64748b', paddingLeft: '1rem', marginBottom: '0.5rem' }}>{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li style={{ color: '#64748b', marginBottom: '0.25rem' }}>{children}</li>
                    ),
                    code: ({ children }) => (
                      <code style={{
                        background: 'rgba(79,156,249,0.08)',
                        border: '1px solid rgba(79,156,249,0.12)',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        color: '#4f9cf9',
                        fontFamily: 'monospace',
                      }}>
                        {children}
                      </code>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 py-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#4f9cf9',
                    opacity: 0.5,
                    animation: 'pulse 1.2s ease-in-out infinite',
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(79,156,249,0.08)' }}>
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={2}
            className="flex-1 text-sm outline-none resize-none rounded-xl px-3.5 py-2.5 transition-all duration-200"
            style={{
              background: 'rgba(79,156,249,0.04)',
              border: '1px solid rgba(79,156,249,0.1)',
              color: '#e2e8f0',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,156,249,0.3)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(79,156,249,0.1)')}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all duration-200 shrink-0"
            style={{
              background: input.trim() ? '#4f9cf9' : 'rgba(79,156,249,0.06)',
              color: input.trim() ? '#080c14' : '#1e3a5f',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              boxShadow: input.trim() ? '0 0 16px rgba(79,156,249,0.3)' : 'none',
            }}
            onMouseEnter={e => {
              if (input.trim()) e.currentTarget.style.boxShadow = '0 0 24px rgba(79,156,249,0.5)'
            }}
            onMouseLeave={e => {
              if (input.trim()) e.currentTarget.style.boxShadow = '0 0 16px rgba(79,156,249,0.3)'
            }}
          >
            Ask
          </button>
        </div>
        <p
          className="text-xs mt-2"
          style={{ color: '#1e3a5f', fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          ⌘ + Enter to send
        </p>
      </div>

    </div>
  )
}