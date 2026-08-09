import { useEffect, useState } from 'react'
import { Api, humanSize, type Torrent } from '../api'

export function Torrents({ api, onPick }: { api: Api; onPick: (t: Torrent) => void }) {
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

  if (error) return <p className="error" role="alert">{error}</p>
  if (!items) return <p className="muted">Loading…</p>

  const shown = items.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div>
      <input
        className="search"
        placeholder="Filter torrents…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {shown.length === 0 ? (
        <p className="muted">No torrents</p>
      ) : (
        <ul className="list">
          {shown.map((t) => (
            <li key={t.hash}>
              <button className="row" onClick={() => onPick(t)}>
                <span className="title">{t.name}</span>
                <span className="meta">
                  {humanSize(t.size)} · {t.is_multi ? 'folder' : 'file'} · ↵ send to Plex
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
