import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Torrents } from './Torrents'
import type { Api, Torrent } from '../api'

const torrents: Torrent[] = [
  { hash: 'H1', name: 'Some Movie', size: 2147483648, is_multi: false, base_rel: 'x', finished: 1 },
  { hash: 'H2', name: 'Some Show', size: 1, is_multi: true, base_rel: 'y', finished: 2 },
]

it('lists torrents and picks one', async () => {
  const api = { torrents: vi.fn().mockResolvedValue({ items: torrents }) } as unknown as Api
  const onPick = vi.fn()
  render(<Torrents api={api} onPick={onPick} />)
  expect(await screen.findByText('Some Movie')).toBeInTheDocument()
  await userEvent.click(screen.getByText('Some Show'))
  expect(onPick).toHaveBeenCalledWith(torrents[1])
})

it('filters torrents', async () => {
  const api = { torrents: vi.fn().mockResolvedValue({ items: torrents }) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  await screen.findByText('Some Movie')
  await userEvent.type(screen.getByPlaceholderText(/filter/i), 'show')
  expect(screen.queryByText('Some Movie')).toBeNull()
  expect(screen.getByText('Some Show')).toBeInTheDocument()
})

it('shows an error', async () => {
  const api = { torrents: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})

it('shows an empty state', async () => {
  const api = { torrents: vi.fn().mockResolvedValue({ items: [] }) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByText('No torrents')).toBeInTheDocument()
})

it('marks a torrent that is already in the library', async () => {
  const items: Torrent[] = [{ ...torrents[0], delivered: true, job: { id: 'J1', state: 'done', pct: 100 } }]
  const api = { torrents: vi.fn().mockResolvedValue({ items }) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByText('in Plex')).toBeInTheDocument()
  expect(screen.getByText(/already in Plex/)).toBeInTheDocument()
  expect(screen.queryByRole('img')).toBeNull()
})

it('shows a ring while a transfer runs', async () => {
  const items: Torrent[] = [{ ...torrents[0], job: { id: 'J1', state: 'active', pct: 35 } }]
  const api = { torrents: vi.fn().mockResolvedValue({ items }) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByRole('img', { name: '35% transferred' })).toBeInTheDocument()
  expect(screen.queryByText('in Plex')).toBeNull()
})

it('shows a ring at zero for a queued transfer', async () => {
  const items: Torrent[] = [{ ...torrents[0], job: { id: 'J1', state: 'queued' } }]
  const api = { torrents: vi.fn().mockResolvedValue({ items }) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByRole('img', { name: '0% transferred' })).toBeInTheDocument()
})

it('leaves a torrent alone when its job failed', async () => {
  const items: Torrent[] = [{ ...torrents[0], job: { id: 'J1', state: 'failed', pct: 12 } }]
  const api = { torrents: vi.fn().mockResolvedValue({ items }) } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByText('Some Movie')).toBeInTheDocument()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByText('in Plex')).toBeNull()
})
