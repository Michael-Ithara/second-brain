import { useCallback, useEffect, useState } from 'react'
import { supabase, invokeFunction } from '../lib/supabase'
import type { Note, EmbedStatus } from '../types'
import { useAuth } from './useAuth'
import { useToast } from '../lib/toast'
import { cancelDeferred, defer, isDeferred } from '../lib/deferred'

// Everything except `embedding` — the vector is large and the UI never needs it.
const NOTE_COLUMNS = 'id, space_id, user_id, title, content, source_url, created_at, updated_at'

// The editor saves every pause in typing; embedding waits for a longer pause,
// so a writing session costs one Voyage call, not one per save. Runs early if
// the tab is hidden (see lib/deferred).
const EMBED_DELAY_MS = 20_000

const embedKey = (id: string) => `embed:${id}`

export function useNotes(spaceId: string | null) {
  const { user } = useAuth()
  const toast = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  // True from the start when there's a space, so a note URL isn't judged
  // missing before the list has loaded.
  const [loading, setLoading] = useState(spaceId !== null)
  // Only notes search is behind on have an entry; absent means up to date.
  const [embedStatus, setEmbedStatus] = useState<Record<string, EmbedStatus>>({})

  // This hook lives above the space (the sidebar and palette share its list),
  // so it doesn't remount on a space switch. Clear the old space's notes during
  // render instead, so they never show under the new space's name.
  const [listedSpace, setListedSpace] = useState(spaceId)
  if (spaceId !== listedSpace) {
    setListedSpace(spaceId)
    setNotes([])
    setEmbedStatus({})
    setLoading(spaceId !== null)
  }

  const setStatus = (id: string, status: EmbedStatus | null) =>
    setEmbedStatus(prev => {
      const next = { ...prev }
      if (status) next[id] = status
      else delete next[id]
      return next
    })

  useEffect(() => {
    if (!spaceId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const [notesRes, statusRes] = await Promise.all([
        supabase
          .from('notes')
          .select(NOTE_COLUMNS)
          .eq('space_id', spaceId)
          .order('created_at', { ascending: false }),
        // Notes whose chunks are missing or made from older text.
        supabase.rpc('note_index_status', { p_space_id: spaceId }),
      ])
      if (cancelled) return
      if (!notesRes.error && notesRes.data) setNotes(notesRes.data)
      if (!statusRes.error && statusRes.data) {
        const rows = statusRes.data as { note_id: string; status: EmbedStatus }[]
        setEmbedStatus(Object.fromEntries(rows.map(r => [
          r.note_id,
          // Edited in this space earlier this session, with its re-embed still to come.
          isDeferred(embedKey(r.note_id)) ? 'pending' as const : r.status,
        ])))
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [spaceId])

  // `failed` is what the note is if this doesn't work: 'missing' if it never had
  // chunks, 'stale' if it keeps older ones.
  const embed = useCallback(async (id: string, failed: EmbedStatus = 'stale') => {
    cancelDeferred(embedKey(id))
    setStatus(id, 'embedding')
    try {
      await invokeFunction('embed-note', { noteId: id })
      // Edited again while this ran: the newly scheduled run will catch up.
      if (!isDeferred(embedKey(id))) setStatus(id, null)
    } catch (err) {
      console.error('Embedding failed:', err)
      if (!isDeferred(embedKey(id))) setStatus(id, failed)
    }
  }, [])

  // One at a time: Voyage's free tier allows only a few requests per minute.
  const indexMissing = async () => {
    const behind = notes.filter(n => embedStatus[n.id] === 'missing' || embedStatus[n.id] === 'stale')
    for (const n of behind) await embed(n.id, embedStatus[n.id])
  }

  // Not optimistic: the editor opens the note by id, so it needs the real one.
  // Throws on failure so the caller can say so.
  const createNote = async (title: string, content: string, sourceUrl?: string) => {
    if (!user || !spaceId) throw new Error('Not signed in')

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

    if (error || !data) throw new Error(error?.message ?? 'Could not create the note')

    setNotes(prev => [data, ...prev])
    if (content.trim()) embed(data.id, 'missing')
    return data
  }

  // Called by the editor's autosave. Throws on failure so it can keep the draft
  // and say so. Old chunks stay searchable until the scheduled embed replaces them.
  const updateNote = async (id: string, title: string, content: string) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(NOTE_COLUMNS)
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Could not save the note')

    setNotes(prev => prev.map(n => (n.id === id ? data : n)))
    setStatus(id, 'pending')
    defer(embedKey(id), () => embed(id), EMBED_DELAY_MS)
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
    }

    setNotes(prev => prev.filter(n => n.id !== id))
    setStatus(id, null)

    defer(key, async () => {
      // Its chunks go with it (on delete cascade); no point embedding first.
      cancelDeferred(embedKey(id))
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

  const retryEmbedding = (id: string) => embed(id, embedStatus[id] === 'missing' ? 'missing' : 'stale')

  return { notes, loading, embedStatus, createNote, updateNote, deleteNote, retryEmbedding, indexMissing }
}
