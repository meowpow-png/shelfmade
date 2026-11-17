import { defineConfig } from 'shelfmade'

import { Note } from './books/{{slug}}/components/Note'

export default defineConfig({
  lang: 'en',
  pageFormat: 'A5',
  books: {
    '{{slug}}': {
      title: '{{title}}',
      components: { Note },
    },
  },
})
