import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SettingsView } from './Settings'

it('saves trimmed settings', async () => {
  const onSave = vi.fn()
  render(<SettingsView settings={{ baseUrl: 'http://x', token: '' }} onSave={onSave} />)
  await userEvent.type(screen.getByPlaceholderText(/bearer/i), 'secret')
  await userEvent.click(screen.getByText('Save'))
  expect(onSave).toHaveBeenCalledWith({ baseUrl: 'http://x', token: 'secret' })
})
