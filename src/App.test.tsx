import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      // The default base URL is relative, so resolve against a base and drop it.
      const path = new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
      const body = path.startsWith('/search')
        ? { guess: {}, candidates: [] }
        : path === '/torrents'
          ? { items: [{ hash: 'H1', name: 'Movie', size: 1, is_multi: false, base_rel: 'x', finished: 1 }] }
          : { jobs: [] }
      return { ok: true, status: 200, json: async () => body } as Response
    }),
  )
})

it('switches between tabs', async () => {
  render(<App />)
  expect(await screen.findByText('Movie')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Jobs' }))
  expect(await screen.findByText('No transfers')).toBeInTheDocument()
})

it('opens and closes the wizard', async () => {
  render(<App />)
  await userEvent.click(await screen.findByText('Movie'))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Close'))
  expect(screen.queryByRole('dialog')).toBeNull()
})
