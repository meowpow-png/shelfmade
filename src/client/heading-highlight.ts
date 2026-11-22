import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const headingStyles = [
  { tag: tags.heading1, fontWeight: 700, fontSize: '1.6em' },
  { tag: tags.heading2, fontWeight: 700, fontSize: '1.35em' },
  { tag: tags.heading3, fontWeight: 700, fontSize: '1.15em' },
  { tag: tags.heading4, fontWeight: 700, fontSize: '1.05em' },
  { tag: tags.heading5, fontWeight: 700, fontSize: '1em' },
  { tag: tags.heading6, fontWeight: 700, fontSize: '0.9em' },
] as const

export const headingHighlight = syntaxHighlighting(HighlightStyle.define([...headingStyles]))
