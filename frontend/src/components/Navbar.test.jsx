import React from 'react'
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

describe('Navbar Users link visibility', () => {
  it('shows Users link for admin role (title case)', () => {
    renderNavbar({ name: 'Admin User', role: 'Admin' })
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('shows Users link for admin role (lowercase)', () => {
    renderNavbar({ name: 'Admin User', role: 'admin' })
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('shows Users link for admin role (uppercase)', () => {
    renderNavbar({ name: 'Admin User', role: 'ADMIN' })
    expect(screen.getByText('Users')).toBeInTheDocument()
  })

  it('hides Users link for manager role', () => {
    renderNavbar({ name: 'Manager User', role: 'Manager' })
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('hides Users link for rep role', () => {
    renderNavbar({ name: 'Rep User', role: 'rep' })
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })

  it('renders other nav links for all roles', () => {
    renderNavbar({ name: 'Rep User', role: 'rep' })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Contacts')).toBeInTheDocument()
    expect(screen.getByText('Activities')).toBeInTheDocument()
  })
})
