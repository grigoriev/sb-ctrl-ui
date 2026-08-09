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
