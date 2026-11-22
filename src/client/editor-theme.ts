import { EditorView } from '@codemirror/view'

export const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--color-text-primary)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-sans)',
    fontSize: '16px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    padding: 0,
    fontFamily: 'var(--font-sans)',
    lineHeight: '1.7',
  },
  '.cm-line': {
    padding: 0,
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-sans)',
    // No fixed height; editor grows with content, no internal scrollbar
    overflow: 'visible',
  },
})
