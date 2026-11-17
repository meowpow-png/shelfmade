import { type ReactNode } from 'react'

interface PullQuoteProps {
  children: ReactNode
  source?: string
}

export function PullQuote({ children, source }: PullQuoteProps) {
  return (
    <figure className="pull-quote">
      <blockquote className="pull-quote-text">{children}</blockquote>
      {source && <figcaption className="pull-quote-source">{source}</figcaption>}
    </figure>
  )
}
