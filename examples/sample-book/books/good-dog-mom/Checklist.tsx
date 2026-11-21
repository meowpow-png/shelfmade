import { type ReactNode } from 'react'

interface ChecklistProps {
  children: ReactNode
  title: string
}

export function Checklist({ children, title }: ChecklistProps) {
  return (
    <aside className="checklist">
      <p className="checklist-title">{title}</p>
      {children}
    </aside>
  )
}
