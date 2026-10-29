import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Space } from '../types'
import { useAuth } from './useAuth'
import { useToast } from '../lib/toast'
import { cancelDeferred, defer } from '../lib/deferred'

export function useSpaces() {
  const { user } = useAuth()
  const toast = useToast()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase
      .from('spaces')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setSpaces(data)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [user])

  // Returns the new space (so the caller can open it), or null after telling the user.
  const createSpace = async (name: string, description?: string): Promise<Space | null> => {
    if (!user) return null

    const { data, error } = await supabase
      .from('spaces')
      .insert({ name, description, user_id: user.id })
      .select()
      .single()

    if (error || !data) {
      toast({ tone: 'error', message: `Couldn’t create “${name}”. Try again.` })
      return null
    }
    setSpaces(prev => [...prev, data])
    return data
  }

  // Hide now, delete in a few seconds unless undone. Deleting a space also
  // deletes its notes, so this matters even more than for a single note.
  const deleteSpace = (id: string) => {
    const index = spaces.findIndex(s => s.id === id)
    const space = spaces[index]
    if (!space) return
    const key = `space:${id}`

    const restore = () =>
      setSpaces(prev => {
        if (prev.some(s => s.id === id)) return prev
        const next = [...prev]
        next.splice(Math.min(index, next.length), 0, space)
        return next
      })

    setSpaces(prev => prev.filter(s => s.id !== id))

    defer(key, async () => {
      const { error } = await supabase.from('spaces').delete().eq('id', id)
      if (error) {
        restore()
        toast({ tone: 'error', message: `Couldn’t delete “${space.name}”. It’s back in the list.` })
      }
    })

    toast({
      message: `Deleted space “${space.name}” and its notes`,
      action: {
        label: 'Undo',
        onClick: () => {
          if (cancelDeferred(key)) restore()
          else toast({ message: 'Too late to undo — it was already deleted.' })
        },
      },
    })
  }

  return { spaces, loading, createSpace, deleteSpace }
}