import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Note, EmbedStatus } from '../types'
import { hostOf } from '../lib/notes'
import { modKey } from '../lib/platform'
import { EmbedBadge } from './EmbedBadge'
import { MarkdownEditor, type MarkdownEditorHandle } from './MarkdownEditor'

// Save after this long without typing.
const SAVE_DELAY_MS = 600

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'
type Draft = { title: string; content: string }

const same = (a: Draft, b: Draft) => a.title === b.title && a.content === b.content

interface Props {
  note: Note
  status?: EmbedStatus
  // Just created: select the "Untitled" title so typing replaces it.
  isNew?: boolean
  onSave: (title: string, content: string) => Promise<void>
  onRetryEmbed: () => void
  onDelete: () => void
}

// Reading view. Same type scale as the editor's highlighting, so switching
// views doesn't make the text jump around.
const reading: Components = {
  h1: ({ children }) => <h1 className="font-display text-[1.6em] font-bold tracking-[-0.02em] mt-6 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="font-display text-[1.35em] font-bold tracking-[-0.015em] mt-6 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="font-display text-[1.15em] font-semibold mt-5 mb-2">{children}</h3>,
  h4: ({ children }) => <h4 className="font-semibold mt-4 mb-1">{children}</h4>,
  p: ({ children }) => <p className="mb-3">{children}</p>,
  ul: ({ children }) => <ul className="pl-5 mb-3 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="pl-5 mb-3 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  blockquote: ({ children }) => <blockquote className="pl-4 mb-3 border-l-2 border-line-2 text-ink-2">{children}</blockquote>,
  hr: () => <hr className="my-6 border-line" />,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline">{children}</a>,
  code: ({ children }) => (
    <code className="font-mono text-[0.9em] text-accent-ink rounded px-[0.35rem] py-[0.1rem] bg-tint-2">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 p-3 rounded-lg overflow-x-auto bg-tint border border-line [&>code]:p-0 [&>code]:bg-transparent">{children}</pre>
  ),
  table: ({ children }) => <div className="mb-3 overflow-x-auto"><table className="text-sm border-collapse">{children}</table></div>,
  th: ({ children }) => <th className="px-3 py-1.5 text-left font-semibold border border-line">{children}</th>,
  td: ({ children }) => <td className="px-3 py-1.5 border border-line">{children}</td>,
}

export function NoteEditor({ note, status, isNew, onSave, onRetryEmbed, onDelete }: Props) {
  const [title, setTitle] = useState(note.title ?? '')
  const [content, setContent] = useState(note.content)
  const [mode, setMode] = useState<'edit' | 'read'>('edit')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const titleRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<MarkdownEditorHandle>(null)

  // Autosave bookkeeping lives in refs: timers and code after an await read
  // it, and must see the latest values, not the ones from an old render.
  const draft = useRef<Draft>({ title: note.title ?? '', content: note.content })
  const saved = useRef<Draft>(draft.current)
  const saving = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave })

  // Writes the draft now. One request at a time; if typing carries on during
  // one, the next waits for the next pause (the timer) rather than going straight out.
  const save = useCallback(async () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    if (saving.current) return
    saving.current = true
    try {
      while (!same(draft.current, saved.current) && timer.current === undefined) {
        const next = draft.current
        setSaveState('saving')
        await onSaveRef.current(next.title, next.content)
        saved.current = next
      }
      setSaveState(same(draft.current, saved.current) ? 'saved' : 'unsaved')
    } catch {
      setSaveState('error')
    } finally {
      saving.current = false
    }
  }, [])

  const edit = (next: Draft) => {
    draft.current = next
    setSaveState('unsaved')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      save()
    }, SAVE_DELAY_MS)
  }

  // Leaving the note (or the page) writes what's pending straight away.
  useEffect(() => {
    const onHidden = () => { if (document.visibilityState === 'hidden') save() }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving.current || !same(draft.current, saved.current)) {
        save()
        e.preventDefault()
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('beforeunload', onBeforeUnload)
      save()
    }
  }, [save])

  useEffect(() => {
    if (isNew) titleRef.current?.select()
  }, [isNew])

  const toggleMode = () => setMode(m => (m === 'edit' ? 'read' : 'edit'))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return
    const key = e.key.toLowerCase()
    // Mod+S: save now (and keep the browser's "Save page" dialog away).
    if (key === 's') { e.preventDefault(); save() }
    // Mod+E: switch between editing and reading, as in Obsidian.
    if (key === 'e') { e.preventDefault(); toggleMode() }
  }

  const words = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className="h-full flex flex-col" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-end gap-1 px-2 sm:px-4 h-11 border-b border-line">
        <button
          onClick={toggleMode}
          aria-pressed={mode === 'read'}
          title={`Reading view (${modKey} + E)`}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 pointer-coarse:py-2.5 rounded-md text-ink-2 transition-colors hover:text-ink hover:bg-tint aria-pressed:text-accent-ink aria-pressed:bg-tint-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>
          </svg>
          Reading view
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete note"
          title="Delete note"
          className="w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 flex items-center justify-center rounded-md text-ink-3 transition-colors hover:text-danger hover:bg-danger-tint"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      {/* Page */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
          {mode === 'read' ? (
            <h1 className={`font-display text-3xl sm:text-[2.25rem] font-extrabold tracking-[-0.035em] leading-tight mb-6 wrap-break-word ${title ? 'text-ink' : 'text-ink-3'}`}>
              {title || 'Untitled'}
            </h1>
          ) : (
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                edit({ ...draft.current, title: e.target.value })
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  e.preventDefault()
                  editorRef.current?.focus('start')
                }
              }}
              placeholder="Untitled"
              aria-label="Note title"
              className="w-full mb-6 bg-transparent font-display text-3xl sm:text-[2.25rem] font-extrabold tracking-[-0.035em] leading-tight text-ink placeholder:text-ink-3 focus-visible:outline-none"
            />
          )}

          {/* Hidden, not unmounted, in reading view, so undo history survives the switch. */}
          <div className={mode === 'read' ? 'hidden' : undefined}>
            <MarkdownEditor
              ref={editorRef}
              initialValue={note.content}
              onChange={value => {
                setContent(value)
                edit({ ...draft.current, content: value })
              }}
              label="Note content"
              placeholder="Start writing…"
              onExitTop={() => titleRef.current?.focus()}
            />
          </div>
          {mode === 'read' && (
            <div className="pb-[30vh] text-ink leading-[1.7] wrap-break-word">
              {content.trim()
                ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={reading}>{content}</ReactMarkdown>
                : <p className="text-ink-3">This note is empty.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-4 py-2 border-t border-line text-xs text-ink-3">
        <EmbedBadge status={status} onRetry={onRetryEmbed} />
        {note.source_url && (
          <a
            href={note.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate max-w-[16rem] rounded text-accent-ink hover:text-accent-ink-hover hover:underline"
          >
            {hostOf(note.source_url)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
        <span>{words} {words === 1 ? 'word' : 'words'}</span>
        {saveState === 'error' ? (
          <span role="alert" className="flex items-center gap-1.5">
            <span className="text-danger">Couldn’t save</span>
            <button onClick={save} className="rounded px-1 -mx-1 text-accent-ink hover:text-accent-ink-hover hover:underline">
              Retry
            </button>
          </span>
        ) : (
          <span>{saveState === 'saved' ? 'Saved' : 'Saving…'}</span>
        )}
      </div>
    </div>
  )
}
