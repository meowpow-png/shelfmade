import { RowMenu } from '@/client/RowMenu'
import { TrashIcon } from '@/client/TrashIcon'

interface BookRowMenuProps {
  title: string
  onDelete: () => void
}

export function BookRowMenu({ title, onDelete }: BookRowMenuProps) {
  return (
    <RowMenu
      label={`Actions for ${title}`}
      items={[
        {
          label: 'Delete book',
          icon: <TrashIcon className="row-menu-item-icon" />,
          destructive: true,
          onSelect: onDelete,
        },
      ]}
    />
  )
}
