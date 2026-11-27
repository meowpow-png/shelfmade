import { useRef } from 'react'
import { Dialog } from 'radix-ui'

interface ChapterDeleteDialogProps {
  open: boolean
  title: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ChapterDeleteDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: ChapterDeleteDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="chapter-delete-overlay" />
        <Dialog.Content
          ref={contentRef}
          className="chapter-delete-content"
          // tabIndex makes the div itself focusable, as the target of the auto-focus override below
          tabIndex={-1}
          // Default auto-focus lands on Cancel, showing its focus ring with no actual keyboard nav
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
        >
          <Dialog.Title className="chapter-delete-title">
            Delete &ldquo;{title}&rdquo;?
          </Dialog.Title>
          <Dialog.Description className="chapter-delete-description">
            This can&rsquo;t be undone.
          </Dialog.Description>
          <div className="chapter-delete-actions">
            <Dialog.Close className="chapter-delete-cancel">Cancel</Dialog.Close>
            <button type="button" className="chapter-delete-confirm" onClick={onConfirm}>
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
