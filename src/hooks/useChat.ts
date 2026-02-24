import { useState } from 'react'
import { invokeFunction } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  answer: string
  sources: { id: string; title: string; content: string; similarity: number }[]
}

export function useChat(spaceId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const sendMessage = async (question: string) => {
    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const { answer } = await invokeFunction<ChatResponse>('chat', {
        question,
        spaceId,
      })

      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
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