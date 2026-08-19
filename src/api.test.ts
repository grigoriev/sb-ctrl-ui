import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  Api,
  candidateName,
  humanSize,
  jobTime,
  mergesIntoDestination,
  runtimeConfig,
  seasonsLabel,
  type Settings,
} from './api'

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

  it('runtimeConfig falls back to the same origin and no token', () => {
    expect(runtimeConfig({} as Window)).toEqual({ baseUrl: '/api', token: '' })
  })

  it('runtimeConfig takes what the container wrote', () => {
    const w = { SB_API_BASE: 'https://host/api', SB_API_TOKEN: 'tok' } as Window
    expect(runtimeConfig(w)).toEqual({ baseUrl: 'https://host/api', token: 'tok' })
  })

  it('runtimeConfig reads the real window by default', () => {
    expect(runtimeConfig().baseUrl).toBe('/api')
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
      collision: 'skip',
    })
  })

  it('createJob can be told to overwrite', async () => {
    const { api, fetchMock } = apiWith({ body: { job_id: 'J1' } })
    await api.createJob('H1', 'movie', 'Film (2024)', 'overwrite')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(init.body as string).collision).toBe('overwrite')
  })

  it('reads a job log', async () => {
    const { api, fetchMock } = apiWith({ body: { log: 'lftp said this' } })
    const out = await api.jobLog('J 1')
    expect(out.log).toBe('lftp said this')
    expect(fetchMock.mock.calls[0][0]).toContain('/jobs/J%201/log')
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

  it('calls fetch on the global object', async () => {
    // A browser rejects fetch invoked as a method of another object. Stand in
    // for that check, since a plain mock accepts any receiver.
    const picky = function (this: unknown): Promise<Response> {
      if (this !== globalThis) throw new TypeError('Illegal invocation')
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [] }) } as Response)
    }
    const api = new Api(SETTINGS, picky as unknown as typeof fetch)
    await expect(api.torrents()).resolves.toEqual({ items: [] })
  })

  it('deleteJob hits the job endpoint', async () => {
    const { api, fetchMock } = apiWith({ body: { deleted: 'J1' } })
    await api.deleteJob('J1')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/jobs/J1')
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
  })

  it('retry hits the retry endpoint', async () => {
    const { api, fetchMock } = apiWith({ body: { job_id: 'J1' } })
    await api.retry('J1')
    expect(fetchMock.mock.calls[0][0]).toBe('http://host/jobs/J1/retry')
  })
})

it('labels no seasons as nothing', () => {
  expect(seasonsLabel([])).toBe('')
})

it('labels one season, singular and plural', () => {
  expect(seasonsLabel([{ season: 1, episodes: 8 }])).toBe('Season 1: 8 episodes')
  expect(seasonsLabel([{ season: 3, episodes: 1 }])).toBe('Season 3: 1 episode')
})

it('labels several seasons with their counts', () => {
  expect(seasonsLabel([{ season: 1, episodes: 8 }, { season: 2, episodes: 10 }])).toBe('Seasons 1 (8), 2 (10)')
})

it('turns epoch seconds into a local time', () => {
  expect(jobTime(1755610000)).toBe(new Date(1755610000000).toLocaleString())
})

it('knows which kinds merge into their destination', () => {
  expect(mergesIntoDestination('series')).toBe(true)
  expect(mergesIntoDestination('cartoon_series')).toBe(true)
  expect(mergesIntoDestination('movie')).toBe(false)
})
