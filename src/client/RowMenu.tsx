import { type ReactNode } from 'react'

import { DropdownMenu } from 'radix-ui'

import { EllipsisVerticalIcon } from '@/client/EllipsisVerticalIcon'

interface RowMenuItem {
  label: string
  icon?: ReactNode
  destructive?: boolean
  onSelect: () => void
}

interface RowMenuProps {
  label: string
  disabled: boolean
  items: RowMenuItem[]
}

export function RowMenu({ label, disabled, items }: RowMenuProps) {
  return (
    // Non-modal: an outside click shouldn't return focus to the trigger and re-reveal it
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button type="button" className="row-menu-trigger" aria-label={label}>
          <EllipsisVerticalIcon className="row-menu-icon" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="row-menu-content" align="end" sideOffset={4}>
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              className={
                item.destructive ? 'row-menu-item row-menu-item-destructive' : 'row-menu-item'
              }
              onSelect={item.onSelect}
            >
              {item.icon}
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
