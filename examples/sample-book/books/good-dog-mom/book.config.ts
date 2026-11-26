import { defineBookConfig } from 'shelfmade'

import { App } from './App'
import { Checklist } from './Checklist'
import { Insight } from './Insight'

export default defineBookConfig({
  components: { Insight, Checklist },
  App,
})
