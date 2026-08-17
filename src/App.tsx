import { useMemo, useState } from 'react'
import { Api, loadSettings, saveSettings, type Settings, type Torrent } from './api'
import { Torrents } from './components/Torrents'
import { Wizard } from './components/Wizard'
import { Jobs } from './components/Jobs'
import { SettingsView } from './components/Settings'

type Tab = 'torrents' | 'jobs' | 'settings'

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [tab, setTab] = useState<Tab>('torrents')
  const [picked, setPicked] = useState<Torrent | null>(null)
  const api = useMemo(() => new Api(settings), [settings])

  function save(next: Settings) {
    saveSettings(next)
    setSettings(next)
    setTab('torrents')
  }

  return (
    <div className="app container py-3">
      <header className="d-flex flex-wrap align-items-baseline gap-2 gap-sm-3 border-bottom pb-2 mb-3">
        <h1 className="h4 m-0">sb-ctrl</h1>
        {/* On a phone the tabs take the second row and stretch across it. */}
        <ul className="nav nav-pills nav-fill flex-grow-1 flex-sm-grow-0">
          {(['torrents', 'jobs', 'settings'] as Tab[]).map((t) => (
            <li className="nav-item" key={t}>
              <button
                type="button"
                className={tab === t ? 'nav-link active' : 'nav-link'}
                onClick={() => setTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            </li>
          ))}
        </ul>
      </header>
      <main>
        {tab === 'torrents' && <Torrents api={api} onPick={setPicked} />}
        {tab === 'jobs' && <Jobs api={api} />}
        {tab === 'settings' && <SettingsView settings={settings} onSave={save} />}
      </main>
      {picked && <Wizard api={api} torrent={picked} onClose={() => setPicked(null)} />}
    </div>
  )
}

export default App
