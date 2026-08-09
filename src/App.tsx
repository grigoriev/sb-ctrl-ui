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
    <div className="app">
      <header>
        <h1>sb-ctrl</h1>
        <nav>
          {(['torrents', 'jobs', 'settings'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
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
