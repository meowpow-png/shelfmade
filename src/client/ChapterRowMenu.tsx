import { PencilIcon } from '@/client/PencilIcon'
import { RowMenu } from '@/client/RowMenu'
import { TrashIcon } from '@/client/TrashIcon'

interface ChapterRowMenuProps {
  title: string
  disabled: boolean
  onRename: () => void
  onDelete: () => void
}

export function ChapterRowMenu({ title, disabled, onRename, onDelete }: ChapterRowMenuProps) {
  return (
    <RowMenu
      label={`Actions for ${title}`}
      disabled={disabled}
      items={[
        {
          label: 'Rename',
          icon: <PencilIcon className="row-menu-item-icon" />,
          onSelect: onRename,
        },
        { label: 'Delete', icon: <TrashIcon className="row-menu-item-icon" />, onSelect: onDelete },
      ]}
    />
  )
}
