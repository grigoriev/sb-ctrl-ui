import { useEffect, useState } from 'react'
import { Api, humanSize, inFlight, type Torrent } from '../api'
import { Ring } from './Ring'

export function Torrents({ api, onPick }: Readonly<{ api: Api; onPick: (t: Torrent) => void }>) {
  const [items, setItems] = useState<Torrent[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let active = true
    api.torrents().then(
      (r) => active && setItems(r.items),
      (e: Error) => active && setError(e.message),
    )
    return () => {
      active = false
    }
  }, [api])

  if (error)
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    )
  if (!items) return <p className="text-body-secondary">Loading…</p>

  const shown = items.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div>
      <input
        className="form-control mb-3"
        type="search"
        placeholder="Filter torrents…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {shown.length === 0 ? (
        <p className="text-body-secondary">No torrents</p>
      ) : (
        <div className="list-group">
          {shown.map((t) => (
            <button
              type="button"
              key={t.hash}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-start gap-2 gap-sm-3"
              onClick={() => onPick(t)}
            >
              {/* Release names are long and unbroken; let them wrap anywhere. */}
              <span className="text-start text-break">
                <span className="fw-semibold">{t.name}</span>
                <br />
                <small className="text-body-secondary">
                  {t.is_multi ? 'folder' : 'file'} · {t.delivered ? 'already in Plex' : 'send to Plex'}
                </small>
              </span>
              <span className="d-flex align-items-center gap-2 flex-shrink-0">
                {t.delivered && <span className="badge text-bg-success rounded-pill">in Plex</span>}
                {t.job && inFlight(t.job.state) && <Ring pct={t.job.pct ?? 0} />}
                <span className="badge text-bg-secondary rounded-pill">{humanSize(t.size)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
