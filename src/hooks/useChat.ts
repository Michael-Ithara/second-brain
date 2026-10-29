import { useCallback, useRef, useState } from 'react'
import { streamFunction } from '../lib/supabase'

export interface Source {
  id: string
  title: string
  content: string
  similarity: number
}

export type AnswerStatus = 'streaming' | 'done' | 'stopped' | 'truncated' | 'error'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  // Assistant only: notes retrieved for this answer, and how the answer ended.
  sources?: Source[]
  status?: AnswerStatus
}

type StreamEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'delta'; text: string }
  | { type: 'done'; stopReason: string | null }
  | { type: 'error'; message: string }

let nextId = 0
const newId = () => `m${++nextId}`

export function useChat(spaceId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const loading = messages.some(m => m.status === 'streaming')

  const patch = useCallback((id: string, change: Partial<Message> | ((m: Message) => Partial<Message>)) =>
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...(typeof change === 'function' ? change(m) : change) } : m))), [])

  // Streams one answer into a placeholder message. `history` is the finished
  // conversation before this question, so follow-ups have context.
  const streamAnswer = useCallback(async (question: string, answerId: string, history: Message[]) => {
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await streamFunction('chat', {
        question,
        spaceId,
        history: history
          .filter(m => m.content && (m.role === 'user' || m.status === 'done'))
          .map(m => ({ role: m.role, content: m.content })),
      }, controller.signal)

      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        // NDJSON: one event per line; keep any partial last line for the next chunk.
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as StreamEvent
          if (event.type === 'sources') patch(answerId, { sources: event.sources })
          else if (event.type === 'delta') patch(answerId, m => ({ content: m.content + event.text }))
          else if (event.type === 'error') patch(answerId, { status: 'error' })
          else if (event.type === 'done') {
            patch(answerId, m => ({
              status: event.stopReason === 'max_tokens' ? 'truncated' : 'done',
              // A refusal can arrive with no text at all.
              content: m.content || (event.stopReason === 'refusal' ? 'I can’t help with that one.' : m.content),
            }))
          }
        }
      }
      // Stream closed without a done/error event (connection dropped).
      patch(answerId, m => (m.status === 'streaming' ? { status: 'error' } : {}))
    } catch (err) {
      const stopped = controller.signal.aborted
      patch(answerId, { status: stopped ? 'stopped' : 'error' })
      if (!stopped) console.error('Chat failed:', err)
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [spaceId, patch])

  const sendMessage = (question: string) => {
    const answerId = newId()
    const history = messages
    setMessages(prev => [
      ...prev,
      { id: newId(), role: 'user', content: question },
      { id: answerId, role: 'assistant', content: '', status: 'streaming' },
    ])
    void streamAnswer(question, answerId, history)
  }

  // Ask the last question again, replacing its answer.
  const retryLast = () => {
    const last = messages[messages.length - 1]
    const question = messages[messages.length - 2]
    if (!last || last.role !== 'assistant' || question?.role !== 'user' || loading) return
    const answerId = newId()
    const history = messages.slice(0, -2)
    setMessages(prev => [...prev.slice(0, -1), { id: answerId, role: 'assistant', content: '', status: 'streaming' }])
    void streamAnswer(question.content, answerId, history)
  }

  const stop = () => abortRef.current?.abort()

  const clearMessages = () => {
    stop()
    setMessages([])
  }

  return { messages, loading, sendMessage, retryLast, stop, clearMessages }
}
