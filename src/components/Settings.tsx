import { useState } from 'react'
import { type Settings } from '../api'

export function SettingsView({ settings, onSave }: Readonly<{ settings: Settings; onSave: (s: Settings) => void }>) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [token, setToken] = useState(settings.token)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ baseUrl: baseUrl.trim(), token: token.trim() })
      }}
    >
      <div className="mb-3">
        <label className="form-label" htmlFor="api-url">
          API URL
        </label>
        <input
          id="api-url"
          className="form-control"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="/api"
          aria-describedby="api-url-help"
        />
        <div className="form-text" id="api-url-help">
          Same origin as this page. Leave it alone unless the API runs elsewhere.
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="api-token">
          Token
        </label>
        <input
          id="api-token"
          className="form-control"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="bearer token"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Save
      </button>
    </form>
  )
}
