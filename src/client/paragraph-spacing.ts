import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'

// Styling a blank line's own height gives
// exact paragraph spacing without special-casing first/last
function buildBlankLineDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { doc } = view.state

  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber++) {
    const line = doc.line(lineNumber)
    if (line.text.trim() === '') {
      builder.add(line.from, line.from, Decoration.line({ class: 'cm-blank-line' }))
    }
  }

  return builder.finish()
}

export const paragraphSpacing = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildBlankLineDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildBlankLineDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)
