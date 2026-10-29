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
  </head>
  <body>${body}</body>
</html>
`
}
