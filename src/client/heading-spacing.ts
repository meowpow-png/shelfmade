import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'

// HighlightStyle only styles the token span,
// not the line box, so margin needs a line decoration
function headingLevelAt(nodeName: string): number | null {
  const match = /^ATXHeading([1-6])$/.exec(nodeName)
  return match ? Number(match[1]) : null
}

// True if every line above this one is blank,
// so the chapter's opening heading skips margin-top
function isFirstContentLine(view: EditorView, lineNumber: number): boolean {
  for (let n = 1; n < lineNumber; n++) {
    if (view.state.doc.line(n).text.trim() !== '') return false
  }
  return true
}

function buildHeadingDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()

  syntaxTree(view.state).iterate({
    enter: (node) => {
      const level = headingLevelAt(node.name)
      if (level === null) return
      const line = view.state.doc.lineAt(node.from)
      const isFirst = isFirstContentLine(view, line.number)
      const className = isFirst ? `cm-heading-${level} cm-heading-first` : `cm-heading-${level}`
      builder.add(line.from, line.from, Decoration.line({ class: className }))

      // Splits the post-heading gap between this line's padding-bottom and the next
      // line's padding-top, so the click boundary lands in the middle of the gap
      if (line.number < view.state.doc.lines) {
        const nextLine = view.state.doc.line(line.number + 1)
        builder.add(nextLine.from, nextLine.from, Decoration.line({ class: 'cm-after-heading' }))
      }
    },
  })

  return builder.finish()
}

export const headingSpacing = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildHeadingDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildHeadingDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)
