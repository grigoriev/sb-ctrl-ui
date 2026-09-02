import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import type { Identity } from './api'

// The Api instance binds fetch once, so the stub stays put and the tests move
// this state instead.
let identity: Identity
let reachable: boolean
let logoutFails: boolean

beforeEach(() => {
  window.location.hash = ''
  identity = { login_required: false, user: null }
  reachable = true
  logoutFails = false
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (!reachable) throw new Error('down')
      // The default base URL is relative, so resolve against a base and drop it.
      const path = new URL(url, 'http://localhost').pathname.replace(/^\/api/, '')
      if (path === '/logout' && logoutFails) throw new Error('down')
      let body: unknown = { jobs: [] }
      if (path === '/me') body = identity
      else if (path === '/torrents')
        body = { items: [{ hash: 'H1', name: 'Movie', size: 1, is_multi: false, base_rel: 'x', finished: 1 }] }
      else if (path.startsWith('/search')) body = { guess: {}, candidates: [] }
      else if (path === '/login') body = { user: 'sergey' }
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
  await screen.findByText('Movie')
  await userEvent.click(screen.getByRole('button', { name: 'Send to Plex: Movie' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Close'))
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('asks for a login when the server wants one, then shows the app', async () => {
  identity = { login_required: true, user: null }
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()

  identity = { login_required: false, user: 'sergey' }
  await userEvent.type(screen.getByLabelText('User'), 'sergey')
  await userEvent.type(screen.getByLabelText('Password'), 'secret')
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Movie')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
})

it('signs out and asks again', async () => {
  identity = { login_required: false, user: 'sergey' }
  render(<App />)
  await screen.findByText('Movie')

  identity = { login_required: true, user: null }
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
})

it('treats an unreachable server as needing a login', async () => {
  reachable = false
  render(<App />)
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
})

it('signs out even when the server refuses to say goodbye', async () => {
  identity = { login_required: false, user: 'sergey' }
  logoutFails = true
  render(<App />)
  await screen.findByText('Movie')

  identity = { login_required: true, user: null }
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
})

it('opens the tab named in the url and keeps it on a reload', async () => {
  window.location.hash = '#jobs'
  const { unmount } = render(<App />)
  expect(await screen.findByText('No transfers')).toBeInTheDocument()
  unmount()

  render(<App />)
  expect(await screen.findByText('No transfers')).toBeInTheDocument()
})

it('writes the chosen tab to the url', async () => {
  render(<App />)
  await screen.findByText('Movie')
  await userEvent.click(screen.getByRole('button', { name: 'Jobs' }))
  expect(window.location.hash).toBe('#jobs')
})
