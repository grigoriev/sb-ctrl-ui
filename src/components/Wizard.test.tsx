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
    poster: 'https://image.tmdb.org/t/p/w154/a.jpg',
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
  expect(api.createJob).toHaveBeenCalledWith('H1', 'movie', 'Some Movie (2024)', 'skip')
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

it('shows a poster when the api sends one', async () => {
  const api = { search: vi.fn().mockResolvedValue({ guess: {}, candidates }) } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  const posters = await screen.findAllByRole('presentation')
  expect(posters).toHaveLength(1)
  expect(posters[0]).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w154/a.jpg')
})

it('asks before it replaces a film that is already there', async () => {
  const api = {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates }),
    createJob: vi
      .fn()
      .mockResolvedValueOnce({ skipped: true, dest_path: '/media/movies/Some Movie (2024)' })
      .mockResolvedValueOnce({ job_id: 'J1' }),
  } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await userEvent.click(await screen.findByText('Some Movie (2024)'))
  expect(await screen.findByRole('alert')).toHaveTextContent('already in the library')
  expect(screen.getByText('/media/movies/Some Movie (2024)')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Replace' }))
  expect(api.createJob).toHaveBeenLastCalledWith('H1', 'movie', 'Some Movie (2024)', 'overwrite')
  expect(await screen.findByRole('status')).toHaveTextContent('Transfer started')
})

it('offers to add episodes to a show that is already there', async () => {
  const series: Candidate[] = [{ ...candidates[0], kind: 'series', tmdb_id: 9 }]
  const api = {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates: series }),
    createJob: vi.fn().mockResolvedValue({ skipped: true, dest_path: '/media/series/Some Movie (2024)' }),
  } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await userEvent.click(await screen.findByText('Some Movie (2024)'))
  expect(await screen.findByRole('alert')).toHaveTextContent('show is already in the library')
  expect(screen.getByRole('button', { name: 'Add episodes' })).toBeInTheDocument()
})

it('goes back to the list from the warning', async () => {
  const api = {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates }),
    createJob: vi.fn().mockResolvedValue({ skipped: true, dest_path: '/media/movies/X' }),
  } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await userEvent.click(await screen.findByText('Some Movie (2024)'))
  await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
  expect(await screen.findByText('Some Movie (2024)')).toBeInTheDocument()
})

it('warns even when the server names no path', async () => {
  const api = {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates }),
    createJob: vi.fn().mockResolvedValue({ skipped: true }),
  } as unknown as Api
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await userEvent.click(await screen.findByText('Some Movie (2024)'))
  expect(await screen.findByRole('alert')).toHaveTextContent('already in the library')
})
