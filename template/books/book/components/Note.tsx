import { type ReactNode } from 'react'

interface NoteProps {
  children: ReactNode
}

export function Note({ children }: NoteProps) {
  return <aside className="note">{children}</aside>
}
