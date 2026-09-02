import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Torrents } from './Torrents'
import type { Api, Job, Torrent } from '../api'

const torrents: Torrent[] = [
  { hash: 'H1', name: 'Some Movie', size: 2147483648, is_multi: false, base_rel: 'x', finished: 1 },
  { hash: 'H2', name: 'Some Show', size: 1, is_multi: true, base_rel: 'y', finished: 2 },
]

/** An api that answers with these torrents and these jobs, and counts the calls. */
function fakeApi(items: Torrent[], jobs: Job[] = []): Api {
  return {
    torrents: vi.fn().mockResolvedValue({ items }),
    jobs: vi.fn().mockResolvedValue({ jobs }),
  } as unknown as Api
}

it('lists torrents and starts one from its own button', async () => {
  const api = fakeApi(torrents)
  const onPick = vi.fn()
  render(<Torrents api={api} onPick={onPick} />)
  expect(await screen.findByText('Some Movie')).toBeInTheDocument()
  await userEvent.click(screen.getAllByRole('button', { name: 'Send to Plex' })[1])
  expect(onPick).toHaveBeenCalledWith(torrents[1])
})

it('does not start a transfer when the row is clicked', async () => {
  const api = fakeApi(torrents)
  const onPick = vi.fn()
  render(<Torrents api={api} onPick={onPick} />)
  await userEvent.click(await screen.findByText('Some Movie'))
  expect(onPick).not.toHaveBeenCalled()
})

it('filters torrents', async () => {
  render(<Torrents api={fakeApi(torrents)} onPick={vi.fn()} />)
  await screen.findByText('Some Movie')
  await userEvent.type(screen.getByPlaceholderText(/filter/i), 'show')
  expect(screen.queryByText('Some Movie')).toBeNull()
  expect(screen.getByText('Some Show')).toBeInTheDocument()
})

it('reads the list again on demand', async () => {
  const api = fakeApi(torrents)
  render(<Torrents api={api} onPick={vi.fn()} />)
  await screen.findByText('Some Movie')
  await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(api.torrents).toHaveBeenCalledTimes(2)
})

it('shows an error', async () => {
  const api = {
    torrents: vi.fn().mockRejectedValue(new Error('boom')),
    jobs: vi.fn().mockResolvedValue({ jobs: [] }),
  } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})

it('shows an empty state', async () => {
  render(<Torrents api={fakeApi([])} onPick={vi.fn()} />)
  expect(await screen.findByText('No torrents')).toBeInTheDocument()
})

it('marks a torrent that is already in the library', async () => {
  const items: Torrent[] = [{ ...torrents[0], delivered: true, library: { have: 1, total: 1 } }]
  render(<Torrents api={fakeApi(items)} onPick={vi.fn()} />)
  expect(await screen.findByText('in Plex')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send again' })).toBeInTheDocument()
})

it('says how much of a pack the library holds', async () => {
  const items: Torrent[] = [{ ...torrents[1], library: { have: 3, total: 8 } }]
  render(<Torrents api={fakeApi(items)} onPick={vi.fn()} />)
  expect(await screen.findByText('3/8 in Plex')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send to Plex' })).toBeInTheDocument()
})

it('follows a running transfer from the job list', async () => {
  const jobs: Job[] = [{ id: 'J1', hash: 'H1', state: 'active', pct: 35, rate: '12.4 MB/s', eta: '3m' }]
  render(<Torrents api={fakeApi(torrents, jobs)} onPick={vi.fn()} />)
  expect(await screen.findByRole('img', { name: '35% transferred' })).toBeInTheDocument()
  expect(screen.getByText('35% · 12.4 MB/s · ETA 3m')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Transferring…' })).toBeDisabled()
})

it('keeps the ring moving as the job reports more', async () => {
  const api = {
    torrents: vi.fn().mockResolvedValue({ items: torrents }),
    jobs: vi
      .fn()
      .mockResolvedValueOnce({ jobs: [{ id: 'J1', hash: 'H1', state: 'active', pct: 10 }] })
      .mockResolvedValue({ jobs: [{ id: 'J1', hash: 'H1', state: 'active', pct: 60 }] }),
  } as unknown as Api
  vi.useFakeTimers({ shouldAdvanceTime: true })
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByRole('img', { name: '10% transferred' })).toBeInTheDocument()
  await vi.advanceTimersByTimeAsync(3000)
  expect(await screen.findByRole('img', { name: '60% transferred' })).toBeInTheDocument()
  vi.useRealTimers()
})

it('reads the torrents again once a transfer ends', async () => {
  const api = {
    torrents: vi.fn().mockResolvedValue({ items: torrents }),
    jobs: vi
      .fn()
      .mockResolvedValueOnce({ jobs: [{ id: 'J1', hash: 'H1', state: 'active', pct: 90 }] })
      .mockResolvedValue({ jobs: [{ id: 'J1', hash: 'H1', state: 'done', pct: 100 }] }),
  } as unknown as Api
  vi.useFakeTimers({ shouldAdvanceTime: true })
  render(<Torrents api={api} onPick={vi.fn()} />)
  await screen.findByRole('img', { name: '90% transferred' })
  await vi.advanceTimersByTimeAsync(3000)
  await waitFor(() => expect(api.torrents).toHaveBeenCalledTimes(2))
  vi.useRealTimers()
})

it('matches a job to its torrent by release name', async () => {
  const items: Torrent[] = [{ ...torrents[1], base_rel: 'files/The.Show.S01' }]
  const jobs: Job[] = [{ id: 'J2', release: 'The.Show.S01', state: 'queued' }]
  render(<Torrents api={fakeApi(items, jobs)} onPick={vi.fn()} />)
  expect(await screen.findByRole('img', { name: '0% transferred' })).toBeInTheDocument()
})

it('leaves a torrent alone when its job failed', async () => {
  const jobs: Job[] = [{ id: 'J1', hash: 'H1', state: 'failed', pct: 12 }]
  render(<Torrents api={fakeApi(torrents, jobs)} onPick={vi.fn()} />)
  expect(await screen.findByText('Some Movie')).toBeInTheDocument()
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.queryByText('in Plex')).toBeNull()
})

it('keeps the list when the job poll fails', async () => {
  const api = {
    torrents: vi.fn().mockResolvedValue({ items: torrents }),
    jobs: vi.fn().mockRejectedValue(new Error('down')),
  } as unknown as Api
  render(<Torrents api={api} onPick={vi.fn()} />)
  expect(await screen.findByText('Some Movie')).toBeInTheDocument()
  expect(screen.queryByRole('alert')).toBeNull()
})
