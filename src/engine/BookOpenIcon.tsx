import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SVG = readFileSync(resolve(__dirname, '../assets/icons/book-open.svg'), 'utf-8')

interface BookOpenIconProps {
  className?: string
}

export function BookOpenIcon({ className }: BookOpenIconProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: SVG }} />
}
