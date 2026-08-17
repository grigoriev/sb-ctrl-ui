import { useEffect, useState, type ReactNode } from 'react'
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

  let body: ReactNode
  if (started) {
    body = <output className="alert alert-success d-block">Transfer started: {started}</output>
  } else if (!candidates) {
    body = <p className="text-body-secondary">Searching TMDb…</p>
  } else if (candidates.length === 0) {
    body = <p className="text-body-secondary">No TMDb matches</p>
  } else {
    body = (
      <div className="list-group">
        {candidates.map((c) => (
          <button
            type="button"
            key={c.tmdb_id}
            className="list-group-item list-group-item-action text-start"
            onClick={() => start(c)}
          >
            <span className="fw-semibold">{candidateName(c)}</span>
            <span className="badge text-bg-light ms-2">{KIND_LABEL[c.kind] ?? c.kind}</span>
            {c.overview && <small className="text-body-secondary d-block">{c.overview}</small>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <dialog open className="modal d-block" aria-label="Send to Plex">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title fs-6">{torrent.name}</h2>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {body}
          </div>
        </div>
      </div>
    </dialog>
  )
}
