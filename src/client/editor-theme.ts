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
  // font-size (not an absolute line-height) keeps this line's click-hit area matching its box
  '.cm-line.cm-blank-line': {
    fontSize: '10px',
  },
  // padding (not margin) keeps this spacing inside the line's own click-hit area
  '.cm-line.cm-heading-1': {
    lineHeight: '1.3',
    paddingTop: '32px',
    paddingBottom: '6px',
  },
  '.cm-line.cm-heading-2': {
    lineHeight: '1.3',
    paddingTop: '28px',
    paddingBottom: '6px',
  },
  '.cm-line.cm-heading-3': {
    lineHeight: '1.3',
    paddingTop: '24px',
    paddingBottom: '6px',
  },
  '.cm-line.cm-heading-4': {
    lineHeight: '1.3',
    paddingTop: '20px',
    paddingBottom: '6px',
  },
  '.cm-line.cm-heading-5': {
    lineHeight: '1.3',
    paddingTop: '18px',
    paddingBottom: '6px',
  },
  '.cm-line.cm-heading-6': {
    lineHeight: '1.3',
    paddingTop: '16px',
    paddingBottom: '6px',
  },
  // Other half of the heading's post-heading gap, owned by the next line's own box
  '.cm-line.cm-after-heading': {
    paddingTop: '6px',
  },
  // Three classes out-specifies the two-class
  // per-level rules above, regardless of declaration order
  '.cm-line.cm-heading-1.cm-heading-first': { paddingTop: '0' },
  '.cm-line.cm-heading-2.cm-heading-first': { paddingTop: '0' },
  '.cm-line.cm-heading-3.cm-heading-first': { paddingTop: '0' },
  '.cm-line.cm-heading-4.cm-heading-first': { paddingTop: '0' },
  '.cm-line.cm-heading-5.cm-heading-first': { paddingTop: '0' },
  '.cm-line.cm-heading-6.cm-heading-first': { paddingTop: '0' },
  '.cm-scroller': {
    fontFamily: 'var(--font-serif)',
    // No fixed height; editor grows with content, no internal scrollbar
    overflow: 'visible',
  },
})
