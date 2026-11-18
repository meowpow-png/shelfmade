import { defineConfig } from 'shelfmade'

import { App as FieldNotesApp } from './books/field-notes/App'
import { PullQuote } from './books/field-notes/PullQuote'
import { Sidebar } from './books/field-notes/Sidebar'
import { App as GoodDogMomApp } from './books/good-dog-mom/App'
import { Checklist } from './books/good-dog-mom/Checklist'
import { Insight } from './books/good-dog-mom/Insight'

export default defineConfig({
  lang: 'en',
  titlePrefix: 'Shelfmade Sample',
  books: {
    'field-notes': {
      title: 'Field Notes from a Small Coast',
      components: { PullQuote, Sidebar },
      App: FieldNotesApp,
    },
    'pocket-tales': {
      title: 'Kleine Geschichten',
      lang: 'de',
      pageFormat: 'A6',
    },
    'good-dog-mom': {
      title: 'How to Be a Good Dog Mom',
      components: { Insight, Checklist },
      App: GoodDogMomApp,
    },
  },
})
