import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Navbar from './Navbar'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'

function renderNavbar(user) {
  useAuth.mockReturnValue({ user, logout: vi.fn() })
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  it('shows Users link for admin user', () => {
    renderNavbar({ name: 'Admin', role: 'admin', org_id: 1 })
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('does not show Users link for rep user', () => {
    renderNavbar({ name: 'Rep', role: 'rep', org_id: 1 })
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('does not show Users link for manager user', () => {
    renderNavbar({ name: 'Manager', role: 'manager', org_id: 1 })
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })
})
