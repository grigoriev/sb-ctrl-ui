import { useState } from 'react'
import { Api } from '../api'

export function Login({ api, onDone }: Readonly<{ api: Api; onDone: () => void }>) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.login(user, password)
      onDone()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto" style={{ maxWidth: '22rem' }}>
      <h2 className="h5 mb-3">Sign in</h2>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="mb-3">
        <label className="form-label" htmlFor="login-user">
          User
        </label>
        <input
          id="login-user"
          className="form-control"
          autoComplete="username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className="form-control"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary w-100" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
