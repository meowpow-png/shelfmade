import svg from '@/assets/icons/ellipsis-vertical.svg?raw'

interface EllipsisVerticalIconProps {
  className?: string
}

export function EllipsisVerticalIcon({ className }: EllipsisVerticalIconProps) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
