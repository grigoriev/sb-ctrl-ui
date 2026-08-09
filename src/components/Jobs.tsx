import { useCallback, useEffect, useState } from 'react'
import { Api, type Job } from '../api'

export function Jobs({ api }: Readonly<{ api: Api }>) {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.jobs().then(
      (r) => {
        setJobs(r.jobs)
        setError('')
      },
      (e: Error) => setError(e.message),
    )
  }, [api])

  useEffect(() => {
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [load])

  if (error) return <p className="error" role="alert">{error}</p>
  if (!jobs) return <p className="muted">Loading…</p>
  if (jobs.length === 0) return <p className="muted">No transfers</p>

  return (
    <ul className="list">
      {jobs.map((j) => (
        <li key={j.id} className="row static">
          <span className="title">{j.name ?? j.id}</span>
          <span className="meta">
            {j.state}
            {j.pct != null ? ` · ${j.pct}%` : ''}
            {j.eta ? ` · ETA ${j.eta}` : ''}
            {j.error ? ` · ${j.error}` : ''}
          </span>
          {j.state === 'failed' && (
            <button type="button" className="retry" onClick={() => api.retry(j.id).then(load)}>
              Retry
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
