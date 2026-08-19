import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Jobs } from './Jobs'
import type { Api, Job } from '../api'

it('renders jobs and retries a failed one', async () => {
  const jobs: Job[] = [
    { id: 'J1', name: 'Movie', state: 'active', pct: 42, rate: '24 MB/s', eta: '3m' },
    { id: 'J2', name: 'Show', state: 'failed', error: 'died' },
  ]
  const api = {
    jobs: vi.fn().mockResolvedValue({ jobs }),
    retry: vi.fn().mockResolvedValue({ job_id: 'J2' }),
  } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('Movie')).toBeInTheDocument()
  expect(screen.getByText(/42%/)).toBeInTheDocument()
  expect(screen.getByText(/24 MB\/s/)).toBeInTheDocument()
  await userEvent.click(screen.getByText('Retry'))
  expect(api.retry).toHaveBeenCalledWith('J2')
})

it('shows no transfers', async () => {
  const api = { jobs: vi.fn().mockResolvedValue({ jobs: [] }) } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('No transfers')).toBeInTheDocument()
})

it('shows an error', async () => {
  const api = { jobs: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('boom')
})

it('falls back to the id when a job has no name', async () => {
  const api = { jobs: vi.fn().mockResolvedValue({ jobs: [{ id: 'JX', state: 'queued' }] }) } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('JX')).toBeInTheDocument()
})

it('deletes a finished job', async () => {
  const jobs: Job[] = [{ id: 'J3', name: 'Old', state: 'done', pct: 100 }]
  const api = {
    jobs: vi.fn().mockResolvedValue({ jobs }),
    deleteJob: vi.fn().mockResolvedValue({ deleted: 'J3' }),
  } as unknown as Api
  render(<Jobs api={api} />)
  await userEvent.click(await screen.findByRole('button', { name: 'Delete Old' }))
  expect(api.deleteJob).toHaveBeenCalledWith('J3')
})

it('offers no delete for a running job', async () => {
  const jobs: Job[] = [{ id: 'J4', name: 'Running', state: 'active', pct: 5 }]
  const api = { jobs: vi.fn().mockResolvedValue({ jobs }) } as unknown as Api
  render(<Jobs api={api} />)
  await screen.findByText('Running')
  expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull()
})

it('reports a refused delete', async () => {
  const jobs: Job[] = [{ id: 'J5', name: 'Stuck', state: 'failed', error: 'died' }]
  const api = {
    jobs: vi.fn().mockResolvedValue({ jobs }),
    deleteJob: vi.fn().mockRejectedValue(new Error('job is running')),
  } as unknown as Api
  render(<Jobs api={api} />)
  await userEvent.click(await screen.findByRole('button', { name: 'Delete Stuck' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('job is running')
})

it('shows what a finished job transferred', async () => {
  const jobs: Job[] = [
    {
      id: 'J9',
      name: '1670 (2023)',
      state: 'done',
      pct: 100,
      release: '1670.S03.WEB-DL.1080p',
      size: 17179869184,
      dest: '/data/media/series/1670 (2023)',
      finished: 1755610000,
      seasons: [{ season: 3, episodes: 8 }],
    },
  ]
  const api = { jobs: vi.fn().mockResolvedValue({ jobs }) } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('1670.S03.WEB-DL.1080p')).toBeInTheDocument()
  expect(screen.getByText(/Season 3: 8 episodes/)).toBeInTheDocument()
  expect(screen.getByText(/16.0 GB/)).toBeInTheDocument()
  expect(screen.getByText('/data/media/series/1670 (2023)')).toBeInTheDocument()
})

it('keeps the card bare for a job from an older version', async () => {
  const jobs: Job[] = [{ id: 'J8', name: 'Old', state: 'done', pct: 100 }]
  const api = { jobs: vi.fn().mockResolvedValue({ jobs }) } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('Old')).toBeInTheDocument()
  expect(screen.queryByText(/Season/)).toBeNull()
})

it('shows the seasons of a job that has no size yet', async () => {
  const jobs: Job[] = [{ id: 'J7', name: 'Show', state: 'active', pct: 10, seasons: [{ season: 1, episodes: 2 }] }]
  const api = { jobs: vi.fn().mockResolvedValue({ jobs }) } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('Season 1: 2 episodes')).toBeInTheDocument()
})
