import { DropdownMenu } from 'radix-ui'

import { EllipsisVerticalIcon } from '@/client/EllipsisVerticalIcon'

interface ChapterRowMenuProps {
  title: string
  disabled: boolean
  onRename: () => void
  onDelete: () => void
}

export function ChapterRowMenu({ title, disabled, onRename, onDelete }: ChapterRowMenuProps) {
  return (
    // Non-modal: an outside click shouldn't return focus to the trigger and re-reveal it
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className="chapter-nav-menu-trigger"
          aria-label={`Actions for ${title}`}
        >
          <EllipsisVerticalIcon className="chapter-nav-menu-icon" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="chapter-nav-menu-content" align="end" sideOffset={4}>
          <DropdownMenu.Item className="chapter-nav-menu-item" onSelect={onRename}>
            Rename
          </DropdownMenu.Item>
          <DropdownMenu.Item className="chapter-nav-menu-item" onSelect={onDelete}>
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
