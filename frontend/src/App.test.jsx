import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.mock('./context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('./components/FeedbackButton', () => ({
  default: () => null,
}))

vi.mock('./components/UserManagement', () => ({
  default: () => <div>User Management Page</div>,
}))

vi.mock('./components/Dashboard', () => ({
  default: () => <div>Dashboard Page</div>,
}))

import { useAuth } from './context/AuthContext'

function renderWithRouter(ui, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  )
}

describe('ProtectedRoute role comparison', () => {
  it('allows access when user role is "Admin" (title case) and required role is "admin"', () => {
    useAuth.mockReturnValue({ user: { name: 'Test', role: 'Admin' }, loading: false })
    renderWithRouter(<App />, { route: '/users' })
    expect(screen.getByText('User Management Page')).toBeInTheDocument()
  })

  it('allows access when user role is "ADMIN" (uppercase) and required role is "admin"', () => {
    useAuth.mockReturnValue({ user: { name: 'Test', role: 'ADMIN' }, loading: false })
    renderWithRouter(<App />, { route: '/users' })
    expect(screen.getByText('User Management Page')).toBeInTheDocument()
  })

  it('allows access when user role is "admin" (lowercase) and required role is "admin"', () => {
    useAuth.mockReturnValue({ user: { name: 'Test', role: 'admin' }, loading: false })
    renderWithRouter(<App />, { route: '/users' })
    expect(screen.getByText('User Management Page')).toBeInTheDocument()
  })

  it('denies access when user role is "rep"', () => {
    useAuth.mockReturnValue({ user: { name: 'Test', role: 'rep' }, loading: false })
    renderWithRouter(<App />, { route: '/users' })
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument()
  })

  it('denies access when user role is "Manager"', () => {
    useAuth.mockReturnValue({ user: { name: 'Test', role: 'Manager' }, loading: false })
    renderWithRouter(<App />, { route: '/users' })
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false })
    renderWithRouter(<App />, { route: '/users' })
    expect(screen.queryByText('User Management Page')).not.toBeInTheDocument()
    expect(screen.queryByText(/Access Denied/)).not.toBeInTheDocument()
  })

  it('allows any authenticated user to access non-role-guarded routes', () => {
    useAuth.mockReturnValue({ user: { name: 'Test', role: 'rep' }, loading: false })
    renderWithRouter(<App />, { route: '/' })
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })
})
