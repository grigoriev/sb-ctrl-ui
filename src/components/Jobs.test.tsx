import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Jobs } from './Jobs'
import type { Api, Job } from '../api'

it('renders jobs and retries a failed one', async () => {
  const jobs: Job[] = [
    { id: 'J1', name: 'Movie', state: 'active', pct: 42, eta: '3m' },
    { id: 'J2', name: 'Show', state: 'failed', error: 'died' },
  ]
  const api = {
    jobs: vi.fn().mockResolvedValue({ jobs }),
    retry: vi.fn().mockResolvedValue({ job_id: 'J2' }),
  } as unknown as Api
  render(<Jobs api={api} />)
  expect(await screen.findByText('Movie')).toBeInTheDocument()
  expect(screen.getByText(/42%/)).toBeInTheDocument()
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
