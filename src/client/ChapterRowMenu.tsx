import { RowMenu } from '@/client/RowMenu'

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
        { label: 'Rename', onSelect: onRename },
        { label: 'Delete', onSelect: onDelete },
      ]}
    />
  )
}
