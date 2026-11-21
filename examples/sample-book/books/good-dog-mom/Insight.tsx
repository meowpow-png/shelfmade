import { type ReactNode } from 'react'

interface InsightProps {
  children: ReactNode
}

export function Insight({ children }: InsightProps) {
  return (
    <figure className="insight">
      <figcaption className="insight-label">Psych Insight</figcaption>
      <blockquote className="insight-text">{children}</blockquote>
    </figure>
  )
}
