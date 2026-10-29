import { useCallback, useEffect, useState } from 'react'
import { supabase, invokeFunction } from '../lib/supabase'
import type { Note, EmbedStatus } from '../types'
import { useAuth } from './useAuth'

// Everything except `embedding` — the vector is large and the UI never needs it.
const NOTE_COLUMNS = 'id, space_id, user_id, title, content, source_url, created_at, updated_at'

export function useNotes(spaceId: string | null) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  // Only notes that aren't searchable yet have an entry; absent means 'ready'.
  const [embedStatus, setEmbedStatus] = useState<Record<string, EmbedStatus>>({})

  const setStatus = (id: string, status: EmbedStatus | null) =>
    setEmbedStatus(prev => {
      const next = { ...prev }
      if (status) next[id] = status
      else delete next[id]
      return next
    })

  useEffect(() => {
    // SpaceView remounts per space (keyed), so there's no stale list to clear.
    if (!spaceId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const [notesRes, missingRes] = await Promise.all([
        supabase
          .from('notes')
          .select(NOTE_COLUMNS)
          .eq('space_id', spaceId)
          .order('created_at', { ascending: false }),
        // Notes with no rows in note_chunks — chat search can't see them.
        supabase.rpc('unindexed_note_ids', { p_space_id: spaceId }),
      ])
      if (cancelled) return
      if (!notesRes.error && notesRes.data) setNotes(notesRes.data)
      if (!missingRes.error && missingRes.data) {
        setEmbedStatus(Object.fromEntries((missingRes.data as string[]).map(id => [id, 'missing' as const])))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [spaceId])

  const embed = useCallback(async (id: string) => {
    setStatus(id, 'embedding')
    try {
      await invokeFunction('embed-note', { noteId: id })
      setStatus(id, null)
    } catch (err) {
      console.error('Embedding failed:', err)
      setStatus(id, 'missing')
    }
  }, [])

  // One at a time: Voyage's free tier allows only a few requests per minute.
  const indexMissing = async () => {
    const ids = Object.keys(embedStatus).filter(id => embedStatus[id] === 'missing')
    for (const id of ids) await embed(id)
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
        source_url: sourceUrl ?? null,
      })
      .select(NOTE_COLUMNS)
      .single()

    if (error || !data) return

    setNotes(prev => [data, ...prev])
    embed(data.id)
  }

  // Throws on failure so the editor can keep the draft and show the error.
  const updateNote = async (id: string, title: string, content: string) => {
    const { data, error } = await supabase
      .from('notes')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
        // No need to clear the old chunks here: a DB trigger drops them when
        // title or content changes, and embed() below writes new ones.
      })
      .eq('id', id)
      .select(NOTE_COLUMNS)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Could not save the note')

    setNotes(prev => prev.map(n => (n.id === id ? data : n)))
    embed(id)
  }

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotes(prev => prev.filter(n => n.id !== id))
      setStatus(id, null)
    }
  }

  return { notes, loading, embedStatus, createNote, updateNote, deleteNote, retryEmbedding: embed, indexMissing }
}
