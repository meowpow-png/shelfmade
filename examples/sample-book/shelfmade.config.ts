import { defineConfig } from 'shelfmade'

import { App } from './books/field-notes/App'
import { PullQuote } from './books/field-notes/PullQuote'
import { Sidebar } from './books/field-notes/Sidebar'

export default defineConfig({
  lang: 'en',
  titlePrefix: 'Shelfmade Sample',
  books: {
    'field-notes': {
      title: 'Field Notes from a Small Coast',
      components: { PullQuote, Sidebar },
      App,
    },
    'pocket-tales': {
      title: 'Kleine Geschichten',
      lang: 'de',
      pageFormat: 'A6',
    },
  },
})
