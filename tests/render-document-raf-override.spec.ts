import { expect, test } from '@playwright/test'

import { renderDocument } from '../src/engine/document'

const baseOptions = {
  title: 'Test',
  lang: 'en',
  pageSize: { width: '210mm', height: '297mm' },
  stylesheets: [],
}

test('the rAF override only appears for the manual-pagination compute frame', () => {
  const computeFrame = renderDocument({ ...baseOptions, autoPaginate: false }, '')
  expect(computeFrame).toContain('window.requestAnimationFrame')
})

test('the static-build/PDF path keeps real requestAnimationFrame', () => {
  const staticBuild = renderDocument(baseOptions, '')
  expect(staticBuild).not.toContain('window.requestAnimationFrame')
})

test('the scriptless display frame gets no scripts at all', () => {
  const displayFrame = renderDocument(
    { ...baseOptions, autoPaginate: false, includeScripts: false },
    '',
  )
  expect(displayFrame).not.toContain('window.requestAnimationFrame')
  expect(displayFrame).not.toContain('<script')
})
