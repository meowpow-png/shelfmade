import svg from '@/assets/icons/trash.svg?raw'

interface TrashIconProps {
  className?: string
}

export function TrashIcon({ className }: TrashIconProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
