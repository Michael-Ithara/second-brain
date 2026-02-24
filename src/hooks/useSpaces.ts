import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Space } from '../types'
import { useAuth } from './useAuth'

export function useSpaces() {
  const { user } = useAuth()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchSpaces()
  }, [user])

  const fetchSpaces = async () => {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) setSpaces(data)
    setLoading(false)
  }

  const createSpace = async (name: string, description?: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from('spaces')
      .insert({ name, description, user_id: user.id })
      .select()
      .single()

    if (!error && data) setSpaces(prev => [...prev, data])
  }

  const deleteSpace = async (id: string) => {
    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', id)

    if (!error) setSpaces(prev => prev.filter(s => s.id !== id))
  }

  return { spaces, loading, createSpace, deleteSpace }
}