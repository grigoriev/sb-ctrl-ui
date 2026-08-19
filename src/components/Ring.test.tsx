import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Ring } from './Ring'

it('labels the ring with the percentage', () => {
  render(<Ring pct={42} />)
  expect(screen.getByRole('img', { name: '42% transferred' })).toBeInTheDocument()
  expect(screen.getByText('42')).toBeInTheDocument()
})

it('clamps a percentage outside the scale', () => {
  const { rerender } = render(<Ring pct={-5} />)
  expect(screen.getByRole('img', { name: '0% transferred' })).toBeInTheDocument()
  rerender(<Ring pct={140} />)
  expect(screen.getByRole('img', { name: '100% transferred' })).toBeInTheDocument()
})

it('rounds a fractional percentage', () => {
  render(<Ring pct={35.6} />)
  expect(screen.getByRole('img', { name: '36% transferred' })).toBeInTheDocument()
})
