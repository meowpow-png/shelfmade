import { type ReactNode } from 'react'

interface SidebarProps {
  children: ReactNode
  title: string
}

export function Sidebar({ children, title }: SidebarProps) {
  return (
    <aside className="sidebar">
      <p className="sidebar-title">{title}</p>
      {children}
    </aside>
  )
}
