import { useState } from 'react'
import { type Settings } from '../api'

export function SettingsView({ settings, onSave }: Readonly<{ settings: Settings; onSave: (s: Settings) => void }>) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [token, setToken] = useState(settings.token)

  return (
    <form
      className="settings"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ baseUrl: baseUrl.trim(), token: token.trim() })
      }}
    >
      <label>
        <span>API URL</span>
        <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://beaver.h.g7v.io" />
      </label>
      <label>
        <span>Token</span>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="bearer token" />
      </label>
      <button type="submit">Save</button>
    </form>
  )
}
