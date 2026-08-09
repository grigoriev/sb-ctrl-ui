import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url).pathname
      const body = path.startsWith('/search')
        ? { guess: {}, candidates: [] }
        : path === '/torrents'
          ? { items: [{ hash: 'H1', name: 'Movie', size: 1, is_multi: false, base_rel: 'x', finished: 1 }] }
          : { jobs: [] }
      return { ok: true, status: 200, json: async () => body } as Response
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

it('switches between tabs', async () => {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Jobs' }))
  expect(await screen.findByText('No transfers')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
  expect(screen.getByText('Save')).toBeInTheDocument()
})

it('opens and closes the wizard', async () => {
  render(<App />)
  await userEvent.click(await screen.findByText('Movie'))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Close'))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('saves settings and returns to torrents', async () => {
  render(<App />)
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await userEvent.type(screen.getByPlaceholderText(/bearer/i), 'tok')
  await userEvent.click(screen.getByText('Save'))
  expect(await screen.findByText('Movie')).toBeInTheDocument()
})
