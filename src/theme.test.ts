import { expect, it, vi } from 'vitest'
import { followColorScheme } from './theme'

function fakeMedia(matches: boolean) {
  const handlers: (() => void)[] = []
  return {
    media: {
      matches,
      addEventListener: (_: string, h: () => void) => handlers.push(h),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList,
    handlers,
  }
}

it('mirrors a dark preference onto the attribute', () => {
  const root = document.createElement('html')
  const { media } = fakeMedia(true)
  followColorScheme(media, root)
  expect(root.getAttribute('data-bs-theme')).toBe('dark')
})

it('follows a switch to light mid-session', () => {
  const root = document.createElement('html')
  const { media, handlers } = fakeMedia(true)
  followColorScheme(media, root)
  Object.defineProperty(media, 'matches', { value: false })
  handlers.forEach((h) => h())
  expect(root.getAttribute('data-bs-theme')).toBe('light')
})

it('stops watching when told to', () => {
  const root = document.createElement('html')
  const { media } = fakeMedia(false)
  followColorScheme(media, root)()
  expect(media.removeEventListener).toHaveBeenCalled()
})
