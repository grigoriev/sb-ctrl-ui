import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { Login } from './Login'
import type { Api } from '../api'

it('signs in and reports back', async () => {
  const api = { login: vi.fn().mockResolvedValue({ user: 'sergey' }) } as unknown as Api
  const onDone = vi.fn()
  render(<Login api={api} onDone={onDone} />)
  await userEvent.type(screen.getByLabelText('User'), 'sergey')
  await userEvent.type(screen.getByLabelText('Password'), 'secret')
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(api.login).toHaveBeenCalledWith('sergey', 'secret')
  expect(onDone).toHaveBeenCalled()
})

it('shows why a sign-in failed', async () => {
  const api = { login: vi.fn().mockRejectedValue(new Error('bad credentials')) } as unknown as Api
  render(<Login api={api} onDone={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('bad credentials')
})
