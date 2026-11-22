import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { type Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

import { headingSpacing } from '@/client/heading-spacing'
import { paragraphSpacing } from '@/client/paragraph-spacing'

// No gutters, line numbers, fold UI, autocomplete, or search panel
export const baseExtensions: Extension[] = [
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  EditorView.lineWrapping,
  markdown(),
  paragraphSpacing,
  headingSpacing,
]
