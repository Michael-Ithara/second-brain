import { useCallback, useEffect, useState } from 'react'
import { supabase, invokeFunction } from '../lib/supabase'
import type { Note, EmbedStatus } from '../types'
import { useAuth } from './useAuth'
import { useToast } from '../lib/toast'
import { cancelDeferred, defer } from '../lib/deferred'

// Everything except `embedding` — the vector is large and the UI never needs it.
const NOTE_COLUMNS = 'id, space_id, user_id, title, content, source_url, created_at, updated_at'

let tempCount = 0

export function useNotes(spaceId: string | null) {
  const { user } = useAuth()
  const toast = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  // Only notes that aren't searchable yet have an entry; absent means 'ready'.
  const [embedStatus, setEmbedStatus] = useState<Record<string, EmbedStatus>>({})
  // Notes added since the list loaded (created, or brought back by Undo), mapped to
  // their React key. Those cards animate in; the key stays the temporary id after
  // the server's id arrives, so the card isn't remounted (and re-animated) then.
  const [fresh, setFresh] = useState<Record<string, string>>({})

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

  // Optimistic: the note is in the list at once, marked 'saving', and swapped for
  // the stored row when the insert returns. Throws on failure (after taking the
  // note back out) so the form or import dialog can keep the text and say so.
  const createNote = async (title: string, content: string, sourceUrl?: string) => {
    if (!user || !spaceId) throw new Error('Not signed in')

    const tempId = `temp-${++tempCount}`
    const now = new Date().toISOString()
    setNotes(prev => [{
      id: tempId, space_id: spaceId, user_id: user.id, title, content,
      source_url: sourceUrl ?? null, created_at: now, updated_at: now,
    }, ...prev])
    setStatus(tempId, 'saving')
    setFresh(prev => ({ ...prev, [tempId]: tempId }))

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

    setStatus(tempId, null)
    if (error || !data) {
      setNotes(prev => prev.filter(n => n.id !== tempId))
      setFresh(prev => { const next = { ...prev }; delete next[tempId]; return next })
      throw new Error(error?.message ?? 'Could not save the note')
    }

    setNotes(prev => prev.map(n => (n.id === tempId ? data : n)))
    setFresh(({ [tempId]: key, ...rest }) => ({ ...rest, [data.id]: key ?? tempId }))
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

  // Hide now, delete in a few seconds unless undone (see lib/deferred).
  const deleteNote = (id: string) => {
    const index = notes.findIndex(n => n.id === id)
    const note = notes[index]
    if (!note) return
    const status = embedStatus[id]
    const key = `note:${id}`

    const restore = () => {
      setNotes(prev => {
        if (prev.some(n => n.id === id)) return prev
        const next = [...prev]
        next.splice(Math.min(index, next.length), 0, note)
        return next
      })
      if (status) setStatus(id, status)
      setFresh(prev => ({ ...prev, [id]: prev[id] ?? id }))
    }

    setNotes(prev => prev.filter(n => n.id !== id))
    setStatus(id, null)

    defer(key, async () => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) {
        restore()
        toast({ tone: 'error', message: `Couldn’t delete “${note.title || 'Untitled note'}”. It’s back in the list.` })
      }
    })

    toast({
      message: `Deleted “${note.title || 'Untitled note'}”`,
      action: {
        label: 'Undo',
        onClick: () => {
          if (cancelDeferred(key)) restore()
          else toast({ message: 'Too late to undo — it was already deleted.' })
        },
      },
    })
  }

  return { notes, loading, embedStatus, fresh, createNote, updateNote, deleteNote, retryEmbedding: embed, indexMissing }
}
