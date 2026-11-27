import { defineBookConfig } from 'shelfmade'

import { App } from './App'
import { PullQuote } from './PullQuote'
import { Sidebar } from './Sidebar'

export default defineBookConfig({
  components: { PullQuote, Sidebar },
  App,
})
