import { useCallback, useEffect, useMemo, useState } from 'react'
import { Api, runtimeConfig, type Identity, type Torrent } from './api'
import { Torrents } from './components/Torrents'
import { Wizard } from './components/Wizard'
import { Jobs } from './components/Jobs'
import { Login } from './components/Login'

const TABS = ['torrents', 'jobs'] as const
type Tab = (typeof TABS)[number]

/** The tab named by the url fragment. A reload keeps the user where they were. */
function tabFromHash(hash: string): Tab {
  const name = hash.replace(/^#/, '')
  return (TABS as readonly string[]).includes(name) ? (name as Tab) : 'torrents'
}

function App() {
  const [tab, setTab] = useState<Tab>(() => tabFromHash(window.location.hash))
  const [picked, setPicked] = useState<Torrent | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const api = useMemo(() => new Api(runtimeConfig()), [])

  const refresh = useCallback(() => {
    api.me().then(setIdentity, () => setIdentity({ login_required: true, user: null }))
  }, [api])

  useEffect(refresh, [refresh])

  useEffect(() => {
    const onHash = () => setTab(tabFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  async function signOut() {
    await api.logout().catch(() => undefined)
    refresh()
  }

  return (
    <div className="app container-fluid px-3 px-lg-4 py-3">
      <header className="d-flex flex-wrap align-items-baseline gap-2 gap-sm-3 border-bottom pb-2 mb-3">
        <h1 className="h4 m-0">sb-ctrl</h1>
        {identity && !identity.login_required && (
          <>
            {/* On a phone the tabs take the second row and stretch across it. */}
            <ul className="nav nav-pills nav-fill flex-grow-1 flex-sm-grow-0">
              {TABS.map((t) => (
                <li className="nav-item" key={t}>
                  <button
                    type="button"
                    className={tab === t ? 'nav-link active' : 'nav-link'}
                    onClick={() => {
                      window.location.hash = t
                      setTab(t)
                    }}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                </li>
              ))}
            </ul>
            {identity.user && (
              <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={signOut}>
                Sign out
              </button>
            )}
          </>
        )}
      </header>
      <main>
        {identity?.login_required && <Login api={api} onDone={refresh} />}
        {identity && !identity.login_required && (
          <>
            {tab === 'torrents' && <Torrents api={api} onPick={setPicked} />}
            {tab === 'jobs' && <Jobs api={api} />}
          </>
        )}
      </main>
      {picked && <Wizard api={api} torrent={picked} onClose={() => setPicked(null)} />}
    </div>
  )
}

export default App
