import { useCallback, useEffect, useState } from 'react'
import { Api, humanSize, jobTime, seasonsLabel, type Job } from '../api'

const STATE_BADGE: Record<string, string> = {
  failed: 'text-bg-danger',
  done: 'text-bg-success',
  active: 'text-bg-primary',
}

/** The one line under the bar: what came down, how much of it, and when. */
function metaLine(j: Job): string {
  return [
    j.seasons?.length ? seasonsLabel(j.seasons) : '',
    j.size ? humanSize(j.size) : '',
    j.finished ? jobTime(j.finished) : '',
  ]
    .filter(Boolean)
    .join(' · ')
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
            {/* The release name is what tells two transfers of one show apart. */}
            {j.release && <small className="text-body-secondary d-block text-break">{j.release}</small>}
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
            {metaLine(j) && <small className="text-body-secondary d-block">{metaLine(j)}</small>}
            {j.dest && <small className="text-body-secondary d-block text-break font-monospace">{j.dest}</small>}
            <div className="d-flex gap-2 mt-2">
              {j.state === 'failed' && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => api.retry(j.id).then(load)}
                >
                  Retry
                </button>
              )}
              {/* A running job is refused by the server, so do not offer it. */}
              {j.state !== 'active' && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label={`Delete ${j.name ?? j.id}`}
                  onClick={() => api.deleteJob(j.id).then(load, (e: Error) => setError(e.message))}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
