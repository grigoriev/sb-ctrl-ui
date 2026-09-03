import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
const KINDS = Object.keys(KIND_LABEL)
/** Where a release TMDb knows nothing about would go. */
const FALLBACK_KIND = 'movie'
/** How long a typed name is left alone before the destination is previewed. */
const PLAN_DELAY = 400

/** The poster and the text of one TMDb match. */
function Match({ candidate }: Readonly<{ candidate: Candidate }>) {
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
function Destination({ plan, kind }: Readonly<{ plan: PlanResult; kind: string }>) {
  let note = ''
  if (plan.collision) {
    note = mergesIntoDestination(kind)
      ? 'The show is already there; the pack adds to it.'
      : 'This replaces what is there.'
  }
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
  kind,
  dest,
  onConfirm,
  onBack,
}: Readonly<{ kind: string; dest: string; onConfirm: () => void; onBack: () => void }>) {
  const merges = mergesIntoDestination(kind)
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
  const [query, setQuery] = useState(torrent.name)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [chosen, setChosen] = useState<Candidate | null>(null)
  const [name, setName] = useState('')
  const [kind, setKind] = useState(FALLBACK_KIND)
  const [plan, setPlan] = useState<PlanResult | null>(null)
  const [error, setError] = useState('')
  const [started, setStarted] = useState('')
  const [occupied, setOccupied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // an answer that arrives after the dialog is gone has nothing to update
  const alive = useRef(true)

  useEffect(
    () => () => {
      alive.current = false
    },
    [],
  )

  useEffect(() => {
    // <dialog open> is not modal, so the browser does not handle Escape for us.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  /** Take a match: it fills in the name and the library, both still editable. */
  function take(candidate: Candidate) {
    setChosen(candidate)
    setName(candidateName(candidate))
    setKind(candidate.kind)
  }

  const search = useCallback(
    (text: string) => {
      setCandidates(null)
      api.search(text).then(
        (r) => {
          if (!alive.current) return
          setCandidates(r.candidates)
          // TMDb answers its best match first, and a release usually has only
          // that one, so nothing has to be picked before starting.
          const first = r.candidates[0]
          if (first) take(first)
          else setName(text)
        },
        (e: Error) => alive.current && setError(e.message),
      )
    },
    [api],
  )

  useEffect(() => {
    search(torrent.name)
  }, [search, torrent])

  useEffect(() => {
    if (!name) {
      setPlan(null)
      return undefined
    }
    // The preview follows the name, though not on every keystroke. A plan has
    // no side effects: it only says where this would land.
    const id = setTimeout(() => {
      api.plan(torrent.hash, kind, name).then(
        (p) => alive.current && setPlan(p),
        () => alive.current && setPlan(null),
      )
    }, PLAN_DELAY)
    return () => clearTimeout(id)
  }, [api, torrent, name, kind])

  async function start(collision: Collision = 'skip') {
    setBusy(true)
    try {
      const result = await api.createJob(torrent.hash, kind, name, collision)
      if (result.skipped) {
        setOccupied(result.dest_path ?? '')
        return
      }
      setOccupied(null)
      setStarted(name)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  let matches: ReactNode
  if (!candidates) {
    matches = <p className="text-body-secondary">Searching TMDb…</p>
  } else if (candidates.length === 0) {
    matches = <p className="text-body-secondary">No TMDb matches. Search again, or send it under the name below.</p>
  } else if (candidates.length === 1) {
    // One match is the normal case, and then there is nothing to choose.
    matches = (
      <div className="card">
        <div className="card-body d-flex align-items-start gap-3 text-break">
          <Match candidate={candidates[0]} />
        </div>
      </div>
    )
  } else {
    matches = (
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
                onChange={() => take(c)}
              />
              <Match candidate={c} />
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  let body: ReactNode
  if (started) {
    body = <output className="alert alert-success d-block">Transfer started: {started}</output>
  } else if (occupied !== null) {
    body = <Occupied kind={kind} dest={occupied} onConfirm={() => start('overwrite')} onBack={() => setOccupied(null)} />
  } else {
    body = (
      <>
        {/* A release name is written for a tracker, not for a search, so the
            query TMDb is asked can be rewritten. */}
        <form
          className="input-group mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            search(query)
          }}
        >
          <input
            className="form-control"
            aria-label="Search TMDb for"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-outline-secondary">
            Search
          </button>
        </form>
        {matches}
        {/* TMDb only proposes. The delivery uses what stands here. */}
        <div className="row g-2 mt-1">
          <div className="col-12 col-sm-8">
            <label className="form-label small mb-1" htmlFor="dest-name">
              Name in the library
            </label>
            <input id="dest-name" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-12 col-sm-4">
            <label className="form-label small mb-1" htmlFor="dest-kind">
              Library
            </label>
            <select id="dest-kind" className="form-select" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {plan && <Destination plan={plan} kind={kind} />}
      </>
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
          </div>
          {/* The transfer starts from this footer and nowhere else, so reading
              about a title never sends 20 GB across the network. */}
          {occupied === null && (
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                {started ? 'Close' : 'Cancel'}
              </button>
              {!started && (
                <button type="button" className="btn btn-primary" disabled={!name || busy} onClick={() => start()}>
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
