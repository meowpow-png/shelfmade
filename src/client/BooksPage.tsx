import { useState } from 'react'

import { BookDeleteDialog } from '@/client/BookDeleteDialog'
import { BookOpenIcon } from '@/client/BookOpenIcon'
import { BookRowMenu } from '@/client/BookRowMenu'
import { NewBookDialog } from '@/client/NewBookDialog'

export interface BookSummary {
  slug: string
  title: string
}

interface BooksPageProps {
  books: BookSummary[]
}

export function BooksPage({ books: initialBooks }: BooksPageProps) {
  const [books, setBooks] = useState(initialBooks)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleteCandidateSlug, setDeleteCandidateSlug] = useState<string>()

  const deleteCandidate = books.find((book) => book.slug === deleteCandidateSlug)

  function createBook(title: string) {
    setCreating(true)
    fetch('/books', { method: 'POST', body: title })
      .then((response) => response.json() as Promise<BookSummary>)
      .then(({ slug }) => {
        window.location.href = `${slug}.html`
      })
      .catch((error: unknown) => {
        console.error('Failed to create book:', error)
        setCreating(false)
      })
  }

  function confirmDelete(slug: string) {
    setDeleteCandidateSlug(undefined)

    fetch(`/books/${slug}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) throw new Error(`Unexpected status ${response.status}`)
        setBooks((current) => current.filter((book) => book.slug !== slug))
      })
      .catch((error: unknown) => console.error(`Failed to delete book "${slug}":`, error))
  }

  return (
    <div className="books-page">
      <div className="books-header">
        <h1 className="books-header-title">Your books</h1>
        <button type="button" className="new-book-button" onClick={() => setDialogOpen(true)}>
          + New book
        </button>
      </div>
      {books.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">No books yet</p>
          <p className="empty-state-description">Create your first book to see it listed here.</p>
        </div>
      ) : (
        <ul className="book-list">
          {books.map(({ slug, title }) => (
            <li key={slug} className="book-row">
              <BookOpenIcon className="book-row-icon" />
              <div className="book-row-info">
                <p className="book-row-title">{title}</p>
                <p className="book-row-path">/books/{slug}</p>
              </div>
              <a className="book-row-open" href={`${slug}.html`}>
                Open
              </a>
              <BookRowMenu title={title} onDelete={() => setDeleteCandidateSlug(slug)} />
            </li>
          ))}
        </ul>
      )}
      <NewBookDialog
        open={dialogOpen}
        creating={creating}
        onOpenChange={setDialogOpen}
        onSubmit={createBook}
      />
      <BookDeleteDialog
        open={deleteCandidate !== undefined}
        title={deleteCandidate?.title ?? ''}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidateSlug(undefined)
        }}
        onConfirm={() => deleteCandidate && confirmDelete(deleteCandidate.slug)}
      />
    </div>
  )
}
