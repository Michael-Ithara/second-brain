import { useEffect, useState } from 'react'
import { supabase, invokeFunction } from '../lib/supabase'
import type { Note } from '../types'
import { useAuth } from './useAuth'

export function useNotes(spaceId: string | null) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!spaceId) {
      setNotes([])
      return
    }
    fetchNotes()
  }, [spaceId])

  const fetchNotes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false })

    if (!error && data) setNotes(data)
    setLoading(false)
  }

  const createNote = async (title: string, content: string, sourceUrl?: string) => {
  if (!user || !spaceId) return

  const { data, error } = await supabase
    .from('notes')
    .insert({ 
      title, 
      content, 
      space_id: spaceId, 
      user_id: user.id,
      source_url: sourceUrl ?? null
    })
    .select()
    .single()

   if (error || !data) return

   setNotes(prev => [data, ...prev])

   invokeFunction('embed-note', { noteId: data.id })
    .catch(err => console.error('Embedding failed:', err))
 }

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (!error) setNotes(prev => prev.filter(n => n.id !== id))
  }

  return { notes, loading, createNote, deleteNote }
}