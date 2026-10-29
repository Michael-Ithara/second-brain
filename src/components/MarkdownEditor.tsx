import { useEffect, useImperativeHandle, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, placeholder as placeholderText } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { tags as t } from '@lezer/highlight'

export interface MarkdownEditorHandle {
  focus: (at?: 'start' | 'end') => void
}

interface Props {
  // Read once, on mount: after that the editor owns the text. Key it per note.
  initialValue: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  // Up arrow on the first line, so the title field above can take focus.
  onExitTop?: () => void
  ref?: React.Ref<MarkdownEditorHandle>
}

// Markdown stays visible (source mode), but styled: headings large, emphasis
// applied, and the syntax marks (#, **, `, >) faded so the text reads first.
// Colours come from the CSS tokens, so light and dark themes both work.
const highlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.6em', fontWeight: '700', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' },
  { tag: t.heading2, fontSize: '1.35em', fontWeight: '700', fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' },
  { tag: t.heading3, fontSize: '1.15em', fontWeight: '600', fontFamily: 'var(--font-display)' },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '600' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--accent-ink)' },
  { tag: t.url, color: 'var(--ink-3)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: '0.9em', color: 'var(--accent-ink)' },
  { tag: t.quote, color: 'var(--ink-2)' },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], color: 'var(--ink-3)' },
])

const theme = EditorView.theme({
  '&': { color: 'var(--ink)', backgroundColor: 'transparent', fontSize: '1rem' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-sans)', lineHeight: '1.7' },
  // Space under the last line, so clicking below the text still lands in the editor.
  '.cm-content': { padding: '0 0 30vh', caretColor: 'var(--ink)' },
  '.cm-line': { padding: '0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ink)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--line-2)',
  },
  '.cm-placeholder': { color: 'var(--ink-3)' },
})

export function MarkdownEditor({ initialValue, onChange, label, placeholder, onExitTop, ref }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // The editor is built once; it calls the latest props through this.
  const callbacks = useRef({ onChange, onExitTop })
  useEffect(() => { callbacks.current = { onChange, onExitTop } })

  useImperativeHandle(ref, () => ({
    focus: (at = 'start') => {
      const view = viewRef.current
      if (!view) return
      view.focus()
      view.dispatch({ selection: { anchor: at === 'start' ? 0 : view.state.doc.length } })
    },
  }), [])

  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          drawSelection(),
          // Enter continues lists and quotes; Tab indents (Escape, then Tab, moves focus on).
          markdown({ base: markdownLanguage }),
          keymap.of([
            {
              key: 'ArrowUp',
              run: v => {
                const exit = callbacks.current.onExitTop
                if (!exit || v.state.doc.lineAt(v.state.selection.main.head).number !== 1) return false
                exit()
                return true
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          syntaxHighlighting(highlight),
          theme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          placeholder ? placeholderText(placeholder) : [],
          EditorView.updateListener.of(update => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Built once per mount: the editor owns the text after the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={hostRef} />
}
