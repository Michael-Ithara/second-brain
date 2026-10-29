import { useState } from 'react'
import { invokeFunction } from '../lib/supabase'

export interface Source {
  id: string
  title: string
  content: string
  similarity: number
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  // Notes retrieved for this answer. Undefined for user messages and errors.
  sources?: Source[]
}

interface ChatResponse {
  answer: string
  sources: Source[] | null
}

export function useChat(spaceId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async (question: string) => {
    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const { answer, sources } = await invokeFunction<ChatResponse>('chat', {
        question,
        spaceId,
      })

      setMessages(prev => [...prev, { role: 'assistant', content: answer, sources: sources ?? [] }])
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearMessages = () => setMessages([])

  return { messages, loading, sendMessage, clearMessages }
}
