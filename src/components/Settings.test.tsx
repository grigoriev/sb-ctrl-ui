import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SettingsView } from './Settings'

it('saves trimmed settings', async () => {
  const onSave = vi.fn()
  render(<SettingsView settings={{ baseUrl: 'http://x', token: '' }} onSave={onSave} />)
  const url = screen.getByPlaceholderText('/api')
  await userEvent.clear(url)
  await userEvent.type(url, '  http://new  ')
  await userEvent.type(screen.getByPlaceholderText(/bearer/i), 'secret')
  await userEvent.click(screen.getByText('Save'))
  expect(onSave).toHaveBeenCalledWith({ baseUrl: 'http://new', token: 'secret' })
})
