import svg from '@/assets/icons/book-open.svg?raw'

interface BookOpenIconProps {
  className?: string
}

// Vite-only (?raw import); engine/BookOpenIcon reads the same SVG via node:fs for the static build
export function BookOpenIcon({ className }: BookOpenIconProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
