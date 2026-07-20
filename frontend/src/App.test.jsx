import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('./context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from './context/AuthContext'

vi.mock('./components/UserManagement', () => ({
  default: () => <div data-testid="user-management">User Management</div>,
}))

import App from './App'

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  )
}

describe('ProtectedRoute role check', () => {
  it('allows access when role matches exactly', () => {
    useAuth.mockReturnValue({ user: { role: 'admin', name: 'Test' }, loading: false })
    renderApp('/users')
    expect(screen.getByTestId('user-management')).toBeTruthy()
  })

  it('allows access when role is title case (Admin)', () => {
    useAuth.mockReturnValue({ user: { role: 'Admin', name: 'Test' }, loading: false })
    renderApp('/users')
    expect(screen.getByTestId('user-management')).toBeTruthy()
  })

  it('allows access when role is upper case (ADMIN)', () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN', name: 'Test' }, loading: false })
    renderApp('/users')
    expect(screen.getByTestId('user-management')).toBeTruthy()
  })

  it('denies access when role is wrong', () => {
    useAuth.mockReturnValue({ user: { role: 'rep', name: 'Test' }, loading: false })
    renderApp('/users')
    expect(screen.queryByTestId('user-management')).toBeNull()
    expect(screen.getByText(/Access Denied/)).toBeTruthy()
  })
})
