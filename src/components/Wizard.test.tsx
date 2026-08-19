import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Wizard } from './Wizard'
import type { Api, Candidate, Torrent } from '../api'

const torrent: Torrent = { hash: 'H1', name: 'Some Movie 2024', size: 1, is_multi: false, base_rel: 'x', finished: 1 }
const candidates: Candidate[] = [
  {
    tmdb_id: 1,
    media: 'movie',
    title: 'Some Movie',
    original_title: 'Some Movie',
    year: '2024',
    overview: 'a film',
    is_animation: false,
    kind: 'movie',
  },
  {
    tmdb_id: 2,
    media: 'tv',
    title: 'Some Toon',
    original_title: 'Some Toon',
    year: '',
    overview: '',
    is_animation: true,
    kind: 'other',
  },
]

it('shows candidates and starts a transfer', async () => {
  const api = {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates }),
    createJob: vi.fn().mockResolvedValue({ job_id: 'J1' }),
  } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await userEvent.click(await screen.findByText('Some Movie (2024)'))
  expect(await screen.findByRole('status')).toHaveTextContent('Transfer started: Some Movie (2024)')
  expect(api.createJob).toHaveBeenCalledWith('H1', 'movie', 'Some Movie (2024)')
})

it('shows no matches', async () => {
  const api = { search: vi.fn().mockResolvedValue({ guess: {}, candidates: [] }) } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByText('No TMDb matches')).toBeInTheDocument()
})

it('reports a search error', async () => {
  const api = { search: vi.fn().mockRejectedValue(new Error('search boom')) } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('search boom')
})

it('reports a start error and closes', async () => {
  const api = {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates }),
    createJob: vi.fn().mockRejectedValue(new Error('nope')),
  } as unknown as Api
  const onClose = vi.fn()
  render(<Wizard api={api} torrent={torrent} onClose={onClose} />)
  await userEvent.click(await screen.findByText('Some Movie (2024)'))
  expect(await screen.findByRole('alert')).toHaveTextContent('nope')
  await userEvent.click(screen.getByLabelText('Close'))
  expect(onClose).toHaveBeenCalled()
})

it('closes on Escape', async () => {
  const api = { search: vi.fn().mockResolvedValue({ guess: {}, candidates }) } as unknown as Api
  const onClose = vi.fn()
  render(<Wizard api={api} torrent={torrent} onClose={onClose} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})
