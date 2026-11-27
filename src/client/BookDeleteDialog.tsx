import { useState } from 'react'
import { Dialog } from 'radix-ui'

interface BookDeleteDialogProps {
  open: boolean
  title: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function BookDeleteDialog({ open, title, onOpenChange, onConfirm }: BookDeleteDialogProps) {
  const [typed, setTyped] = useState('')
  const matches = typed === title

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('')
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="book-delete-overlay" />
        <Dialog.Content className="book-delete-content">
          <Dialog.Title className="book-delete-title">Delete &ldquo;{title}&rdquo;?</Dialog.Title>
          <Dialog.Description className="book-delete-description">
            This will permanently delete the book and can&rsquo;t be undone. Type the book title to
            confirm.
          </Dialog.Description>
          <input
            type="text"
            className="book-delete-input"
            value={typed}
            autoFocus
            placeholder={title}
            onChange={(event) => setTyped(event.target.value)}
          />
          <div className="book-delete-actions">
            <Dialog.Close className="book-delete-cancel">Cancel</Dialog.Close>
            <button
              type="button"
              className="book-delete-confirm"
              disabled={!matches}
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
