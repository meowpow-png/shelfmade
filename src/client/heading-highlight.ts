import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

// line-height lives in heading-spacing.ts's
// line decoration; a span can't win against its line's
const headingFont = {
  fontFamily: 'var(--font-heading)',
  fontWeight: 600,
}

const headingStyles = [
  { tag: tags.heading1, ...headingFont, fontSize: '26px' },
  { tag: tags.heading2, ...headingFont, fontSize: '21px' },
  { tag: tags.heading3, ...headingFont, fontSize: '18px' },
  { tag: tags.heading4, ...headingFont, fontSize: '16px' },
  { tag: tags.heading5, ...headingFont, fontSize: '15px' },
  { tag: tags.heading6, ...headingFont, fontSize: '14px' },
] as const

export const headingHighlight = syntaxHighlighting(HighlightStyle.define([...headingStyles]))
