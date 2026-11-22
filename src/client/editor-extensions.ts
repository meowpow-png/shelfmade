import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

// No gutters, line numbers, fold UI, autocomplete, or search panel
export const baseExtensions: Extension[] = [
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  EditorView.lineWrapping,
  markdown(),
]
