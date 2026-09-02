import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Api,
  humanSize,
  inFlight,
  libraryLabel,
  progressLabel,
  withJobs,
  type Intent,
  type Job,
  type Torrent,
} from '../api'
import { Ring } from './Ring'

/** How often the job list is asked what the running transfers are doing. */
const POLL_MS = 3000

/** Whether this row has a transfer on its way right now. */
function isRunning(t: Torrent): boolean {
  return Boolean(t.job && inFlight(t.job.state))
}

/** The line under the name: what is happening now, or what the row offers. */
function metaLine(t: Torrent): string {
  if (t.job && isRunning(t)) return progressLabel(t.job)
  return [t.is_multi ? 'folder' : 'file', libraryLabel(t)].filter(Boolean).join(' · ')
}

function startLabel(t: Torrent): string {
  if (isRunning(t)) return 'Transferring…'
  return t.delivered ? 'Send again' : 'Send to Plex'
}

export function Torrents({
  api,
  onPick,
}: Readonly<{ api: Api; onPick: (t: Torrent, intent: Intent) => void }>) {
  const [items, setItems] = useState<Torrent[] | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  // what was running at the last poll, so the end of a transfer is noticed
  const running = useRef<Set<string>>(new Set())

  const load = useCallback(() => {
    api.torrents().then(
      (r) => setItems(r.items),
      (e: Error) => setError(e.message),
    )
  }, [api])

  useEffect(load, [load])

  useEffect(() => {
    // A finished transfer changes what the library holds, so the rows are read
    // again. While nothing ends, the jobs alone keep the list moving: they are
    // local files, where the torrent list asks the seedbox.
    const poll = () =>
      api.jobs().then(
        (r) => {
          setJobs(r.jobs)
          const now = new Set(r.jobs.filter((j) => inFlight(j.state)).map((j) => j.id))
          const ended = [...running.current].some((id) => !now.has(id))
          running.current = now
          if (ended) load()
        },
        () => undefined,
      )
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [api, load])

  if (error)
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  if (!items) return <p className="text-body-secondary">Loading…</p>

  const shown = withJobs(items, jobs).filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div>
      <div className="d-flex gap-2 mb-3">
        <input
          className="form-control"
          type="search"
          placeholder="Filter torrents…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="btn btn-outline-secondary flex-shrink-0" onClick={load}>
          Refresh
        </button>
      </div>
      {shown.length === 0 ? (
        <p className="text-body-secondary">No torrents</p>
      ) : (
        <div className="list-group">
          {shown.map((t) => (
            <div
              key={t.hash}
              className="list-group-item d-flex justify-content-between align-items-center gap-2 gap-sm-3"
            >
              {/* Release names are long and unbroken; let them wrap anywhere. */}
              <span className="text-start text-break">
                <span className="fw-semibold">{t.name}</span>
                <br />
                <small className="text-body-secondary">{metaLine(t)}</small>
              </span>
              <span className="d-flex align-items-center gap-2 flex-shrink-0">
                {libraryLabel(t) && <span className="badge text-bg-success rounded-pill">{libraryLabel(t)}</span>}
                {t.job && isRunning(t) && <Ring pct={t.job.pct ?? 0} />}
                <span className="badge text-bg-secondary rounded-pill d-none d-sm-inline">{humanSize(t.size)}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  aria-label={`Details of ${t.name}`}
                  onClick={() => onPick(t, 'details')}
                >
                  Details
                </button>
                <button
                  type="button"
                  className={t.delivered ? 'btn btn-sm btn-outline-primary' : 'btn btn-sm btn-primary'}
                  aria-label={`${startLabel(t)}: ${t.name}`}
                  disabled={isRunning(t)}
                  onClick={() => onPick(t, 'send')}
                >
                  {startLabel(t)}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
