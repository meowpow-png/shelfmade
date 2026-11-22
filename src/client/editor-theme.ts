import { EditorView } from '@codemirror/view'

export const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--editor-text-color)',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-serif)',
    fontSize: 'var(--editor-font-size)',
    fontWeight: '400',
    letterSpacing: 'normal',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-content': {
    maxWidth: '680px',
    margin: '0 auto',
    fontFamily: 'var(--font-serif)',
    lineHeight: '1.6',
    textAlign: 'left',
    hyphens: 'none',
  },
  '.cm-line': {
    padding: 0,
    lineHeight: '1.6',
  },
  '.cm-line.cm-blank-line': {
    lineHeight: '16px',
  },
  '.cm-line.cm-heading-1': {
    lineHeight: '1.3',
    marginTop: '32px',
    marginBottom: '12px',
  },
  '.cm-line.cm-heading-2': {
    lineHeight: '1.3',
    marginTop: '28px',
    marginBottom: '12px',
  },
  '.cm-line.cm-heading-3': {
    lineHeight: '1.3',
    marginTop: '24px',
    marginBottom: '12px',
  },
  '.cm-line.cm-heading-4': {
    lineHeight: '1.3',
    marginTop: '20px',
    marginBottom: '12px',
  },
  '.cm-line.cm-heading-5': {
    lineHeight: '1.3',
    marginTop: '18px',
    marginBottom: '12px',
  },
  '.cm-line.cm-heading-6': {
    lineHeight: '1.3',
    marginTop: '16px',
    marginBottom: '12px',
  },
  // Three classes out-specifies the two-class
  // per-level rules above, regardless of declaration order
  '.cm-line.cm-heading-1.cm-heading-first': { marginTop: '0' },
  '.cm-line.cm-heading-2.cm-heading-first': { marginTop: '0' },
  '.cm-line.cm-heading-3.cm-heading-first': { marginTop: '0' },
  '.cm-line.cm-heading-4.cm-heading-first': { marginTop: '0' },
  '.cm-line.cm-heading-5.cm-heading-first': { marginTop: '0' },
  '.cm-line.cm-heading-6.cm-heading-first': { marginTop: '0' },
  '.cm-scroller': {
    fontFamily: 'var(--font-serif)',
    // No fixed height; editor grows with content, no internal scrollbar
    overflow: 'visible',
  },
})
