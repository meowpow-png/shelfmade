// eager: lazy entries never get imported,
// so they're not real deps and edits won't invalidate
import.meta.glob('/**/*.mdx', { eager: true })
