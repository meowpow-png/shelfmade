interface DocumentOptions {
  title: string
  lang: string
}

export function renderDocument({ title, lang }: DocumentOptions, body: string) {
  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
  </head>
  <body>${body}</body>
</html>
`
}
