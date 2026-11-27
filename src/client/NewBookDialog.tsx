import { useState, type FormEvent } from 'react'
import { Dialog } from 'radix-ui'

interface NewBookDialogProps {
  open: boolean
  creating: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string) => void
}

export function NewBookDialog({ open, creating, onOpenChange, onSubmit }: NewBookDialogProps) {
  const [title, setTitle] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '' || creating) return
    onSubmit(trimmed)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTitle('')
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="new-book-overlay" />
        <Dialog.Content className="new-book-content">
          <Dialog.Title className="new-book-title">New book</Dialog.Title>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="new-book-input"
              value={title}
              autoFocus
              disabled={creating}
              placeholder="Book title"
              onChange={(event) => setTitle(event.target.value)}
            />
            <div className="new-book-actions">
              <Dialog.Close className="new-book-cancel">Cancel</Dialog.Close>
              <button
                type="submit"
                className="new-book-confirm"
                disabled={creating || title.trim() === ''}
              >
                Create
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
