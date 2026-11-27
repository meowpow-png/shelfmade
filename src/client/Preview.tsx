export function Preview() {
  return (
    <div className="preview">
      {/* Populated client-side by book-page.tsx; hidden until pagination finishes */}
      <div id="book-root" style={{ visibility: 'hidden' }} />
    </div>
  )
}
