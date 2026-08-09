import { useEffect, useState } from 'react'
import { Api, candidateName, type Candidate, type Torrent } from '../api'

const KIND_LABEL: Record<string, string> = {
  movie: 'Movie',
  cartoon: 'Cartoon',
  series: 'Series',
  cartoon_series: 'Cartoon series',
}

export function Wizard({ api, torrent, onClose }: Readonly<{ api: Api; torrent: Torrent; onClose: () => void }>) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [error, setError] = useState('')
  const [started, setStarted] = useState('')

  useEffect(() => {
    let active = true
    api.search(torrent.name).then(
      (r) => active && setCandidates(r.candidates),
      (e: Error) => active && setError(e.message),
    )
    return () => {
      active = false
    }
  }, [api, torrent])

  async function start(c: Candidate) {
    try {
      await api.createJob(torrent.hash, c.kind, candidateName(c))
      setStarted(candidateName(c))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="modal" role="dialog" aria-label="Send to Plex">
      <div className="modal-head">
        <h2>{torrent.name}</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {started ? (
        <p className="ok" role="status">Transfer started: {started}</p>
      ) : !candidates ? (
        <p className="muted">Searching TMDb…</p>
      ) : candidates.length === 0 ? (
        <p className="muted">No TMDb matches</p>
      ) : (
        <ul className="list">
          {candidates.map((c) => (
            <li key={c.tmdb_id}>
              <button type="button" className="row" onClick={() => start(c)}>
                <span className="title">{candidateName(c)}</span>
                <span className="meta">
                  {KIND_LABEL[c.kind] ?? c.kind}
                  {c.overview ? ` · ${c.overview}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
