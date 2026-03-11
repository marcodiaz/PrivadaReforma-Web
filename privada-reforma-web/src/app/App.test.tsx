import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    const { unmount } = render(<App />)
    unmount()
  })

  it('renders login flow by default', async () => {
    render(<App />)
    expect(await screen.findByText('Acceso seguro')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })
})
