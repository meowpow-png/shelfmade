import { type PageSize } from '@/engine/page-format'

interface DocumentOptions {
  title: string
  lang: string
  pageSize: PageSize
  stylesheets: string[]
}

export function renderDocument(
  { title, lang, pageSize, stylesheets }: DocumentOptions,
  body: string,
) {
  const links = stylesheets.map((href) => `    <link rel="stylesheet" href="${href}" />`).join('\n')

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <link rel="stylesheet" href="shelfmade/tokens.css" />
    <link rel="stylesheet" href="shelfmade/pagination/pagination.css" />
    <style>${renderPageSize(pageSize)}</style>
${links}
    <link rel="stylesheet" href="shelfmade/preview.css" media="screen" />
    <script>window.PagedConfig = { after: () => { window.PAGED_READY = true } };</script>
    <script src="shelfmade/vendor/paged.polyfill.min.js"></script>
    <script src="shelfmade/pagination/break-token.js"></script>
    <script src="shelfmade/pagination/measurement.js"></script>
    <script src="shelfmade/pagination/rendered-elements.js"></script>
    <script src="shelfmade/pagination/protect-paragraph-ending.js"></script>
    <script src="shelfmade/pagination/keep-heading-with-paragraph.js"></script>
    <script src="shelfmade/pagination/keep-hyphenated-word-together.js"></script>
    <script src="shelfmade/pagination/min-widow-lines.js"></script>
    <script src="shelfmade/pagination/min-orphan-lines.js"></script>
    <script src="shelfmade/pagination/break-token-dispatch.js"></script>
    <script src="shelfmade/pagination/pagination-rules.js"></script>
  </head>
  <body>${body}</body>
</html>
`
}

export function renderIndex(body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Books</title>
  </head>
  <body>
    <h1>Books</h1>
    ${body}
  </body>
</html>
`
}

// The page size sits between the runtime and book stylesheets,
// so it overrides the runtime's A5 default while the
// book's stylesheets can still override it
function renderPageSize({ width, height }: PageSize) {
  return `:root { --page-width: ${width}; --page-height: ${height}; } @page { size: ${width} ${height}; }`
}
