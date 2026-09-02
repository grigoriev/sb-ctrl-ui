import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Wizard } from './Wizard'
import type { Api, Candidate, Torrent } from '../api'

const torrent: Torrent = { hash: 'H1', name: 'Some Movie 2024', size: 1, is_multi: false, base_rel: 'x', finished: 1 }
const one: Candidate = {
  tmdb_id: 1,
  media: 'movie',
  title: 'Some Movie',
  original_title: 'Some Movie',
  year: '2024',
  overview: 'a film',
  is_animation: false,
  kind: 'movie',
  poster: 'https://image.tmdb.org/t/p/w154/a.jpg',
}
const two: Candidate = {
  tmdb_id: 2,
  media: 'tv',
  title: 'Some Toon',
  original_title: 'Some Toon',
  year: '',
  overview: '',
  is_animation: true,
  kind: 'other',
}
const PLAN = { dest_path: '/data/media/movies/Some Movie (2024)/Some Movie (2024).mkv', collision: false }

/** An api that finds these candidates and previews a free destination. */
function fakeApi(candidates: Candidate[], extra: Partial<Api> = {}): Api {
  return {
    search: vi.fn().mockResolvedValue({ guess: {}, candidates }),
    plan: vi.fn().mockResolvedValue(PLAN),
    createJob: vi.fn().mockResolvedValue({ job_id: 'J1' }),
    ...extra,
  } as unknown as Api
}

it('starts the only match without picking anything first', async () => {
  const api = fakeApi([one])
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  expect(screen.queryByRole('radio')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Transfer started: Some Movie (2024)')
  expect(api.createJob).toHaveBeenCalledWith('H1', 'movie', 'Some Movie (2024)', 'skip')
})

it('says where the transfer lands', async () => {
  render(<Wizard api={fakeApi([one])} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByText(PLAN.dest_path)).toBeInTheDocument()
})

it('warns about a taken destination before anything is started', async () => {
  const api = fakeApi([one], {
    plan: vi.fn().mockResolvedValue({ dest_path: '/data/media/movies/Some Movie (2024)', collision: true }),
  })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByText('This replaces what is there.')).toBeInTheDocument()
})

it('says a pack is added to a show that is already there', async () => {
  const series: Candidate = { ...one, kind: 'series' }
  const api = fakeApi([series], {
    plan: vi.fn().mockResolvedValue({ dest_path: '/data/media/series/Some Movie (2024)', collision: true }),
  })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByText('The show is already there; the pack adds to it.')).toBeInTheDocument()
})

it('says nothing about the destination when the preview fails', async () => {
  const api = fakeApi([one], { plan: vi.fn().mockRejectedValue(new Error('no')) })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  expect(screen.queryByText(/Lands in/)).toBeNull()
})

it('lets a second match be chosen when TMDb finds more than one', async () => {
  const api = fakeApi([one, two])
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  const radios = await screen.findAllByRole('radio')
  expect(radios[0]).toBeChecked()
  await userEvent.click(radios[1])
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(api.createJob).toHaveBeenCalledWith('H1', 'other', 'Some Toon', 'skip')
})

it('opens on the description and sends only when asked', async () => {
  const api = fakeApi([one])
  render(<Wizard api={api} torrent={torrent} intent="details" onClose={vi.fn()} />)
  expect(await screen.findByText('a film')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Start transfer' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Send to Plex' }))
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(api.createJob).toHaveBeenCalled()
})

it('cannot be started twice', async () => {
  let release = () => undefined as unknown as void
  const api = fakeApi([one], {
    createJob: vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ job_id: 'J1' })
        }),
    ),
  })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  const starting = await screen.findByRole('button', { name: 'Starting…' })
  expect(starting).toBeDisabled()
  release()
  expect(await screen.findByRole('status')).toBeInTheDocument()
  expect(api.createJob).toHaveBeenCalledTimes(1)
})

it('shows no matches', async () => {
  render(<Wizard api={fakeApi([])} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByText('No TMDb matches')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Start transfer' })).toBeDisabled()
})

it('reports a search error', async () => {
  const api = fakeApi([], { search: vi.fn().mockRejectedValue(new Error('search boom')) })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('search boom')
})

it('reports a start error and closes', async () => {
  const api = fakeApi([one], { createJob: vi.fn().mockRejectedValue(new Error('nope')) })
  const onClose = vi.fn()
  render(<Wizard api={api} torrent={torrent} onClose={onClose} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('nope')
  await userEvent.click(screen.getByLabelText('Close'))
  expect(onClose).toHaveBeenCalled()
})

it('closes on Escape', async () => {
  const onClose = vi.fn()
  render(<Wizard api={fakeApi([one])} torrent={torrent} onClose={onClose} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalled()
})

it('cancels without starting anything', async () => {
  const api = fakeApi([one])
  const onClose = vi.fn()
  render(<Wizard api={api} torrent={torrent} onClose={onClose} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(api.createJob).not.toHaveBeenCalled()
})

it('shows a poster when the api sends one', async () => {
  render(<Wizard api={fakeApi([one])} torrent={torrent} onClose={vi.fn()} />)
  const posters = await screen.findAllByRole('presentation')
  expect(posters).toHaveLength(1)
  expect(posters[0]).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w154/a.jpg')
})

it('asks before it replaces a film the server finds in the way', async () => {
  const api = fakeApi([one], {
    createJob: vi
      .fn()
      .mockResolvedValueOnce({ skipped: true, dest_path: '/media/movies/Some Movie (2024)' })
      .mockResolvedValueOnce({ job_id: 'J1' }),
  })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('already in the library')
  expect(screen.getByText('/media/movies/Some Movie (2024)')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Replace' }))
  expect(api.createJob).toHaveBeenLastCalledWith('H1', 'movie', 'Some Movie (2024)', 'overwrite')
  expect(await screen.findByRole('status')).toHaveTextContent('Transfer started')
})

it('offers to add episodes to a show that is already there', async () => {
  const series: Candidate = { ...one, kind: 'series' }
  const api = fakeApi([series], {
    createJob: vi.fn().mockResolvedValue({ skipped: true, dest_path: '/media/series/Some Movie (2024)' }),
  })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('show is already in the library')
  expect(screen.getByRole('button', { name: 'Add episodes' })).toBeInTheDocument()
})

it('goes back to the title from the warning', async () => {
  const api = fakeApi([one], { createJob: vi.fn().mockResolvedValue({ skipped: true, dest_path: '/media/movies/X' }) })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
  expect(await screen.findByText('a film')).toBeInTheDocument()
})

it('warns even when the server names no path', async () => {
  const api = fakeApi([one], { createJob: vi.fn().mockResolvedValue({ skipped: true }) })
  render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Some Movie (2024)')
  await userEvent.click(screen.getByRole('button', { name: 'Start transfer' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('already in the library')
})

it('names the release and its size in the header', async () => {
  const pack: Torrent = { ...torrent, is_multi: true, size: 2147483648 }
  render(<Wizard api={fakeApi([one])} torrent={pack} onClose={vi.fn()} />)
  expect(await screen.findByText('Some Movie 2024')).toBeInTheDocument()
  expect(screen.getByText('folder · 2.0 GB')).toBeInTheDocument()
})

it('shows a candidate with no overview', async () => {
  render(<Wizard api={fakeApi([two])} torrent={torrent} onClose={vi.fn()} />)
  expect(await screen.findByText('Some Toon')).toBeInTheDocument()
  expect(screen.queryByRole('presentation')).toBeNull()
})


it('drops the answer when the dialog is closed first', async () => {
  let answer = () => undefined as unknown as void
  const api = fakeApi([one], {
    search: vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          answer = () => resolve({ guess: {}, candidates: [one] })
        }),
    ),
  })
  const { unmount } = render(<Wizard api={api} torrent={torrent} onClose={vi.fn()} />)
  await screen.findByText('Searching TMDb…')
  unmount()
  answer()
  expect(screen.queryByText('Some Movie (2024)')).toBeNull()
})
