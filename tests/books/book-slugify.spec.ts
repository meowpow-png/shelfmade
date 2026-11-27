import { expect, test } from '@playwright/test'

import { slugify } from '../../src/cli/init'

test('an accented Latin title is reduced to plain ASCII', () => {
  expect(slugify('Café Days')).toBe('cafe-days')
})

test('a non-Latin script title keeps its own letters instead of collapsing to a fallback', () => {
  expect(slugify('日記')).toBe('日記')
  expect(slugify('Дневник')).toBe('дневник')
})

test('distinct non-Latin titles no longer collide on the same fallback slug', () => {
  expect(slugify('日記')).not.toBe(slugify('Дневник'))
})

test('a symbol-only title still falls back to the generic slug', () => {
  expect(slugify('★★★')).toBe('my-book')
})
