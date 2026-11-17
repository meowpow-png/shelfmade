import { type PageFormat } from '@/config'

export interface PageSize {
  width: string
  height: string
}

const PAGE_SIZES: Record<Exclude<PageFormat, PageSize>, PageSize> = {
  A4: { width: '210mm', height: '297mm' },
  A5: { width: '148mm', height: '210mm' },
  A6: { width: '105mm', height: '148mm' },
  Letter: { width: '8.5in', height: '11in' },
}

export function resolvePageSize(format: PageFormat): PageSize {
  return typeof format === 'string' ? PAGE_SIZES[format] : format
}
