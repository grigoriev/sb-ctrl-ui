import { useEffect, useState, type ReactNode } from 'react'
import { Api, candidateName, mergesIntoDestination, type Candidate, type Collision, type Torrent } from '../api'

const KIND_LABEL: Record<string, string> = {
  movie: 'Movie',
  cartoon: 'Cartoon',
  series: 'Series',
  cartoon_series: 'Cartoon series',
}

/** Shown when the destination is taken, so nothing is replaced unasked. */
function Occupied({
  candidate,
  dest,
  onConfirm,
  onBack,
}: Readonly<{ candidate: Candidate; dest: string; onConfirm: () => void; onBack: () => void }>) {
  const merges = mergesIntoDestination(candidate.kind)
  return (
    <div>
      <div className="alert alert-warning" role="alert">
        <p className="mb-1">
          {merges ? 'This show is already in the library.' : 'This title is already in the library.'}
        </p>
        <p className="mb-1 font-monospace text-break">{dest}</p>
        <p className="mb-0">
          {merges
            ? 'Continuing adds the episodes of this pack and replaces the ones it repeats.'
            : 'Continuing replaces what is there.'}
        </p>
      </div>
      <div className="d-flex gap-2">
        <button type="button" className="btn btn-warning" onClick={onConfirm}>
          {merges ? 'Add episodes' : 'Replace'}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}

export function Wizard({ api, torrent, onClose }: Readonly<{ api: Api; torrent: Torrent; onClose: () => void }>) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [error, setError] = useState('')
  const [started, setStarted] = useState('')
  const [occupied, setOccupied] = useState<{ candidate: Candidate; dest: string } | null>(null)

  useEffect(() => {
    // <dialog open> is not modal, so the browser does not handle Escape for us.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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

  async function start(c: Candidate, collision: Collision = 'skip') {
    try {
      const result = await api.createJob(torrent.hash, c.kind, candidateName(c), collision)
      if (result.skipped) {
        setOccupied({ candidate: c, dest: result.dest_path ?? '' })
        return
      }
      setOccupied(null)
      setStarted(candidateName(c))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  let body: ReactNode
  if (started) {
    body = <output className="alert alert-success d-block">Transfer started: {started}</output>
  } else if (occupied) {
    body = (
      <Occupied
        {...occupied}
        onConfirm={() => start(occupied.candidate, 'overwrite')}
        onBack={() => setOccupied(null)}
      />
    )
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
            className="list-group-item list-group-item-action text-start text-break d-flex align-items-start gap-3"
            onClick={() => start(c)}
          >
            {/* align-items-start keeps the 2:3 poster from stretching to the row height. */}
            {c.poster && (
              <img
                src={c.poster}
                alt=""
                width={70}
                height={105}
                loading="lazy"
                className="rounded flex-shrink-0 object-fit-cover"
              />
            )}
            <span>
              <span className="fw-semibold">{candidateName(c)}</span>
              <span className="badge text-bg-light ms-2">{KIND_LABEL[c.kind] ?? c.kind}</span>
              {c.overview && <small className="text-body-secondary d-block">{c.overview}</small>}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <dialog open className="modal d-block" aria-label="Send to Plex">
      {/* Full screen on a phone, a centred scrollable box from tablets up. */}
      <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title fs-6 text-break">{torrent.name}</h2>
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
