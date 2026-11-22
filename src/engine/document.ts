import { type PageSize } from '@/engine/page-format'

interface DocumentOptions {
  title: string
  lang: string
  pageSize: PageSize
  stylesheets: string[]
  // Loaded media="screen" so pagedjs's stylesheet reprocessing never touches them
  screenStylesheets?: string[]
  // False for a frame that'll run its own manual Previewer - the two can't coexist
  autoPaginate?: boolean
  // False for a frame that only displays already-paginated content, no pagedjs/plugins needed
  includeScripts?: boolean
}

export function renderDocument(
  {
    title,
    lang,
    pageSize,
    stylesheets,
    screenStylesheets = [],
    autoPaginate = true,
    includeScripts = true,
  }: DocumentOptions,
  body: string,
) {
  const links = stylesheets.map((href) => `    <link rel="stylesheet" href="${href}" />`).join('\n')
  const screenLinks = screenStylesheets
    .map((href) => `    <link rel="stylesheet" href="${href}" media="screen" />`)
    .join('\n')
  const pagedConfig = autoPaginate
    ? '{ after: () => { window.PAGED_READY = true } }'
    : '{ after: () => { window.PAGED_READY = true }, auto: false }'
  const scripts = includeScripts
    ? `    <script>window.PagedConfig = ${pagedConfig};</script>
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
    <script src="shelfmade/pagination/pagination-rules.js"></script>`
    : ''

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
${screenLinks}
${scripts}
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
    <link rel="stylesheet" href="shelfmade/tokens.css" />
    <link rel="stylesheet" href="shelfmade/fonts.css" />
    <link rel="stylesheet" href="shelfmade/topbar.css" />
    <link rel="stylesheet" href="shelfmade/index.css" />
  </head>
  <body>
    ${renderTopbar('Books')}
    ${body}
  </body>
</html>
`
}

// Sits between runtime and book stylesheets: overrides the runtime default,
// but book styles can still override this
function renderPageSize({ width, height }: PageSize) {
  return `:root { --page-width: ${width}; --page-height: ${height}; } @page { size: ${width} ${height}; }`
}

export function renderTopbar(label: string) {
  return `<div class="topbar">
      <p class="topbar-wordmark">Shelfmade</p>
      <div class="topbar-divider"></div>
      <span class="topbar-label">${label}</span>
    </div>`
}
