import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders project title', () => {
    render(<App />)
    expect(screen.getByText('Privada Reforma Web')).toBeInTheDocument()
  })
})
