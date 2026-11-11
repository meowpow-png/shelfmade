interface DocumentOptions {
  title: string
  lang: string
  stylesheets: string[]
}

export function renderDocument({ title, lang, stylesheets }: DocumentOptions, body: string) {
  const links = stylesheets.map((href) => `    <link rel="stylesheet" href="${href}" />`).join('\n')

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
${links}
    <link rel="stylesheet" href="shelfmade/preview.css" media="screen" />
    <script>window.PagedConfig = { after: () => { window.PAGED_READY = true } };</script>
    <script src="shelfmade/vendor/paged.polyfill.min.js"></script>
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
