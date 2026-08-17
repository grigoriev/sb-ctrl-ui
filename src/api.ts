export interface Torrent {
  hash: string
  name: string
  size: number
  is_multi: boolean
  base_rel: string
  finished: number
}

export interface Candidate {
  tmdb_id: number
  media: string
  title: string
  original_title: string
  year: string
  overview: string
  is_animation: boolean
  kind: string
}

export interface SearchResult {
  guess: { media: string; query: string; year: string }
  candidates: Candidate[]
}

export interface Job {
  id: string
  name?: string
  state: string
  pct?: number
  rate?: string
  eta?: string
  error?: string
}

export interface Settings {
  baseUrl: string
  token: string
}

declare global {
  interface Window {
    SB_API_BASE?: string
    SB_API_TOKEN?: string
  }
}

/**
 * Where the API lives and, if a deployment has no proxy to add it, the bearer
 * token. Both come from the container: its entrypoint writes /config.js from
 * the environment before the app loads. Defaults suit a deployment that serves
 * the UI and the API on one origin and authenticates at the proxy.
 *
 * A token placed here is readable by anyone who can load the page. Prefer a
 * proxy that adds the Authorization header instead.
 */
export function runtimeConfig(w: Window = window): Settings {
  return { baseUrl: w.SB_API_BASE ?? '/api', token: w.SB_API_TOKEN ?? '' }
}

export function candidateName(c: Candidate): string {
  return c.year ? `${c.original_title} (${c.year})` : c.original_title
}

export function humanSize(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
  if (bytes >= 1048576) return `${Math.floor(bytes / 1048576)} MB`
  return `${Math.floor(bytes / 1024)} KB`
}

export class Api {
  private readonly settings: Settings
  private readonly fetchImpl: typeof fetch

  constructor(settings: Settings, fetchImpl: typeof fetch = fetch) {
    this.settings = settings
    // Bind to the global object. Stored on the instance, fetch would be called
    // as a method of this class, and a browser then throws TypeError before it
    // sends anything. request() would report that as "server unreachable".
    this.fetchImpl = fetchImpl.bind(globalThis)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {}
    if (this.settings.token) headers.Authorization = `Bearer ${this.settings.token}`
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    let res: Response
    try {
      res = await this.fetchImpl(`${this.settings.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new Error('server unreachable — connect to VPN or LAN')
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || data.error || `HTTP ${res.status}`)
    }
    return (await res.json()) as T
  }

  torrents(): Promise<{ items: Torrent[] }> {
    return this.request('GET', '/torrents')
  }

  search(name: string): Promise<SearchResult> {
    return this.request('GET', `/search?name=${encodeURIComponent(name)}`)
  }

  createJob(hash: string, kind: string, name: string): Promise<{ job_id: string }> {
    return this.request('POST', '/jobs', { hash, kind, name, collision: 'overwrite' })
  }

  jobs(): Promise<{ jobs: Job[] }> {
    return this.request('GET', '/jobs')
  }

  retry(id: string): Promise<{ job_id: string }> {
    return this.request('POST', `/jobs/${encodeURIComponent(id)}/retry`)
  }
}
