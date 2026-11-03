import { useCallback, useEffect, useRef, useState } from 'react'
import { Api, humanSize, jobTime, seasonsLabel, type Job } from '../api'

const STATE_BADGE: Record<string, string> = {
  failed: 'text-bg-danger',
  stalled: 'text-bg-warning',
  done: 'text-bg-success',
  active: 'text-bg-primary',
}

/** A job that ended badly can be run again, and is worth a look at its log. */
function endedBadly(state: string): boolean {
  return state === 'failed' || state === 'stalled'
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
  // The error of Retry, Log or Delete. The poll does not clear it, the next of these or Close does.
  const [actionError, setActionError] = useState('')
  // Counts the requests, so a late answer of a replaced request does not show.
  const lastAction = useRef(0)
  const [log, setLog] = useState<{ id: string; text: string } | null>(null)

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

  /**
   * Runs the request of Retry, Log or Delete, then `done` with its answer. Its error stays until
   * the next one. A request a later one replaced does nothing when it answers.
   */
  const act = <T,>(request: Promise<T>, done?: (answer: T) => void) => {
    const action = ++lastAction.current
    setActionError('')
    request.then(
      (answer) => {
        if (action === lastAction.current) done?.(answer)
      },
      (e: Error) => {
        if (action === lastAction.current) setActionError(e.message)
      },
    )
  }

  // Shown above every state of the list: the poll can empty it or fail.
  return (
    <div>
      {actionError && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {actionError}
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setActionError('')} />
        </div>
      )}
      {list()}
    </div>
  )

  function list() {
    if (error)
      return (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )
    if (!jobs) return <p className="text-body-secondary">Loading…</p>
    if (jobs.length === 0) return <p className="text-body-secondary">No transfers</p>
    return jobs.map((j) => (
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
            <div className="progress mt-2 position-relative">
              <progress value={j.pct} max={100} aria-label="progress" />
              <span className="progress-label" style={{ width: `${j.pct}%` }} aria-hidden="true">
                {j.pct}%
              </span>
            </div>
          )}
          <small className="text-body-secondary d-block mt-2">
            {j.rate ? `${j.rate} · ` : ''}
            {j.eta ? `ETA ${j.eta}` : ''}
            {j.error ?? ''}
          </small>
          {metaLine(j) && <small className="text-body-secondary d-block">{metaLine(j)}</small>}
          {j.dest && <small className="text-body-secondary d-block text-break font-monospace">{j.dest}</small>}
          {log?.id === j.id && (
            <pre className="bg-body-tertiary border rounded p-2 mt-2 small overflow-auto" style={{ maxHeight: 260 }}>
              {log.text || 'the job wrote no log'}
            </pre>
          )}
          <div className="d-flex gap-2 mt-2">
            {endedBadly(j.state) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => act(api.retry(j.id), load)}
              >
                Retry
              </button>
            )}
            {endedBadly(j.state) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() =>
                  log?.id === j.id
                    ? setLog(null)
                    : act(api.jobLog(j.id), (r) => setLog({ id: j.id, text: r.log }))
                }
              >
                {log?.id === j.id ? 'Hide log' : 'Log'}
              </button>
            )}
            {/* A running job is refused by the server, so do not offer it. */}
            {j.state !== 'active' && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                aria-label={`Delete ${j.name ?? j.id}`}
                onClick={() => act(api.deleteJob(j.id), load)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    ))
  }
}
