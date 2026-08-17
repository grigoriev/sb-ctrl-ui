import { afterEach, describe, expect, it, vi } from 'vitest'
import { Api, candidateName, humanSize, loadSettings, saveSettings, type Settings } from './api'

const SETTINGS: Settings = { baseUrl: 'http://host', token: 'tok' }

function apiWith(response: {
  ok?: boolean
  status?: number
  body?: unknown
  reject?: boolean
  jsonReject?: boolean
}) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
    if (response.reject) throw new Error('network')
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => {
        if (response.jsonReject) throw new Error('bad json')
        return response.body ?? {}
      },
    } as Response
  })
  return { api: new Api(SETTINGS, fetchMock as unknown as typeof fetch), fetchMock }
}

afterEach(() => localStorage.clear())

describe('helpers', () => {
  it('humanSize formats bytes', () => {
    expect(humanSize(2147483648)).toBe('2.0 GB')
    expect(humanSize(5242880)).toBe('5 MB')
    expect(humanSize(2048)).toBe('2 KB')
  })

  it('candidateName appends the year when present', () => {
    expect(candidateName({ original_title: 'Film', year: '2024' } as never)).toBe('Film (2024)')
    expect(candidateName({ original_title: 'Film', year: '' } as never)).toBe('Film')
  })

  it('settings round-trip through localStorage', () => {
    expect(loadSettings().baseUrl).toBe('/api')
    saveSettings({ baseUrl: 'http://x', token: 'k' })
    expect(loadSettings()).toEqual({ baseUrl: 'http://x', token: 'k' })
  })

  it('loadSettings tolerates corrupt storage', () => {
    localStorage.setItem('sb-ctrl-ui.settings', 'not json')
    expect(loadSettings().baseUrl).toBe('/api')
  })
})

describe('Api', () => {
  it('sends the bearer token and returns JSON', async () => {
    const { api, fetchMock } = apiWith({ body: { items: [] } })
    await api.torrents()
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/torrents')
  })

  it('search encodes the name', async () => {
    const { api, fetchMock } = apiWith({ body: { candidates: [] } })
    await api.search('a b')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/search?name=a%20b')
  })

  it('createJob posts the body', async () => {
    const { api, fetchMock } = apiWith({ body: { job_id: 'J1' } })
    const out = await api.createJob('H1', 'movie', 'Film (2024)')
    expect(out.job_id).toBe('J1')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      hash: 'H1',
      kind: 'movie',
      name: 'Film (2024)',
      collision: 'overwrite',
    })
  })

  it('surfaces an API error detail', async () => {
    const { api } = apiWith({ ok: false, status: 404, body: { detail: 'nope' } })
    await expect(api.jobs()).rejects.toThrow('nope')
  })

  it('falls back to the HTTP status when there is no detail', async () => {
    const { api } = apiWith({ ok: false, status: 500, body: {} })
    await expect(api.jobs()).rejects.toThrow('HTTP 500')
  })

  it('tolerates an unparseable error body', async () => {
    const { api } = apiWith({ ok: false, status: 503, jsonReject: true })
    await expect(api.jobs()).rejects.toThrow('HTTP 503')
  })

  it('reports an unreachable server', async () => {
    const { api } = apiWith({ reject: true })
    await expect(api.torrents()).rejects.toThrow('unreachable')
  })

  it('retry hits the retry endpoint', async () => {
    const { api, fetchMock } = apiWith({ body: { job_id: 'J1' } })
    await api.retry('J1')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/jobs/J1/retry')
  })
})
