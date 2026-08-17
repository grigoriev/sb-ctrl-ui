import { useCallback, useEffect, useState } from 'react'
import { Api, type Job } from '../api'

const STATE_BADGE: Record<string, string> = {
  failed: 'text-bg-danger',
  done: 'text-bg-success',
  active: 'text-bg-primary',
}

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

  if (error)
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  if (!jobs) return <p className="text-body-secondary">Loading…</p>
  if (jobs.length === 0) return <p className="text-body-secondary">No transfers</p>

  return (
    <div>
      {jobs.map((j) => (
        <div className="card mb-2" key={j.id}>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <span className="fw-semibold text-break">{j.name ?? j.id}</span>
              <span className={`badge flex-shrink-0 ${STATE_BADGE[j.state] ?? 'text-bg-secondary'}`}>
                {j.state}
              </span>
            </div>
            {j.pct != null && (
              <div className="progress mt-2" role="progressbar" aria-label="progress" aria-valuenow={j.pct}>
                <div className="progress-bar" style={{ width: `${j.pct}%` }}>
                  {j.pct}%
                </div>
              </div>
            )}
            <small className="text-body-secondary d-block mt-2">
              {j.rate ? `${j.rate} · ` : ''}
              {j.eta ? `ETA ${j.eta}` : ''}
              {j.error ?? ''}
            </small>
            {j.state === 'failed' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mt-2"
                onClick={() => api.retry(j.id).then(load)}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
