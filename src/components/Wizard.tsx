import { useEffect, useState, type ReactNode } from 'react'
import {
  Api,
  candidateName,
  humanSize,
  mergesIntoDestination,
  type Candidate,
  type Collision,
  type PlanResult,
  type Torrent,
} from '../api'

const KIND_LABEL: Record<string, string> = {
  movie: 'Movie',
  cartoon: 'Cartoon',
  series: 'Series',
  cartoon_series: 'Cartoon series',
}

/** The poster and the text of one TMDb match. */
function Details({ candidate }: Readonly<{ candidate: Candidate }>) {
  return (
    <>
      {/* align-items-start keeps the 2:3 poster from stretching to the row height. */}
      {candidate.poster && (
        <img
          src={candidate.poster}
          alt=""
          width={70}
          height={105}
          loading="lazy"
          className="rounded flex-shrink-0 object-fit-cover"
        />
      )}
      <span>
        <span className="fw-semibold">{candidateName(candidate)}</span>
        <span className="badge text-bg-light ms-2">{KIND_LABEL[candidate.kind] ?? candidate.kind}</span>
        {candidate.overview && <small className="text-body-secondary d-block">{candidate.overview}</small>}
      </span>
    </>
  )
}

/** Where this lands, and what it does to whatever is there already. */
function Destination({ plan, candidate }: Readonly<{ plan: PlanResult; candidate: Candidate }>) {
  const merges = mergesIntoDestination(candidate.kind)
  let note = ''
  if (plan.collision) note = merges ? 'The show is already there; the pack adds to it.' : 'This replaces what is there.'
  return (
    <div className="mt-3 small text-body-secondary">
      <div className="text-break">
        Lands in <span className="font-monospace">{plan.dest_path}</span>
      </div>
      {note && <div className="text-warning-emphasis">{note}</div>}
    </div>
  )
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
  const [chosen, setChosen] = useState<Candidate | null>(null)
  const [plan, setPlan] = useState<PlanResult | null>(null)
  const [occupied, setOccupied] = useState<{ candidate: Candidate; dest: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // <dialog open> is not modal, so the browser does not handle Escape for us.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let active = true
    api.search(torrent.name).then(
      (r) => {
        if (!active) return
        setCandidates(r.candidates)
        // TMDb answers its best match first, and a release usually has only
        // that one, so nothing has to be picked before starting.
        setChosen(r.candidates[0] ?? null)
      },
      (e: Error) => active && setError(e.message),
    )
    return () => {
      active = false
    }
  }, [api, torrent])

  useEffect(() => {
    if (!chosen) return undefined
    let active = true
    // The plan is a preview with no side effects: it says where this lands
    // and whether something is there, before anything is started.
    api.plan(torrent.hash, chosen.kind, candidateName(chosen)).then(
      (p) => active && setPlan(p),
      () => active && setPlan(null),
    )
    return () => {
      active = false
    }
  }, [api, torrent, chosen])

  async function start(c: Candidate, collision: Collision = 'skip') {
    setBusy(true)
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
    } finally {
      setBusy(false)
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
  } else if (candidates.length === 1) {
    // One match is the normal case, and then there is nothing to choose.
    body = (
      <div className="card">
        <div className="card-body d-flex align-items-start gap-3 text-break">
          <Details candidate={candidates[0]} />
        </div>
      </div>
    )
  } else {
    body = (
      <fieldset>
        <legend className="fs-6 text-body-secondary">TMDb found more than one match</legend>
        <div className="list-group">
          {candidates.map((c) => (
            <label key={c.tmdb_id} className="list-group-item d-flex align-items-start gap-3 text-break">
              <input
                className="form-check-input flex-shrink-0 mt-1"
                type="radio"
                name="candidate"
                checked={chosen?.tmdb_id === c.tmdb_id}
                onChange={() => setChosen(c)}
              />
              <Details candidate={c} />
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  return (
    <dialog open className="modal d-block" aria-label="Send to Plex">
      {/* Full screen on a phone, a centred scrollable box from tablets up. */}
      <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 className="modal-title fs-6 text-break">{torrent.name}</h2>
              <small className="text-body-secondary">
                {torrent.is_multi ? 'folder' : 'file'} · {humanSize(torrent.size)}
              </small>
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {body}
            {!started && !occupied && plan && chosen && <Destination plan={plan} candidate={chosen} />}
          </div>
          {/* The transfer starts from this footer and nowhere else, so reading
              about a title never sends 20 GB across the network. */}
          {!occupied && (
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                {started ? 'Close' : 'Cancel'}
              </button>
              {!started && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!chosen || busy}
                  onClick={() => chosen && start(chosen)}
                >
                  {busy ? 'Starting…' : 'Start transfer'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
