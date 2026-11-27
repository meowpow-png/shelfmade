import svg from '@/assets/icons/pencil.svg?raw'

interface PencilIconProps {
  className?: string
}

export function PencilIcon({ className }: PencilIconProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
