import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import App from '../App'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('./UserManagement', () => ({
  default: () => <div>User Management Page</div>,
}))

vi.mock('./Dashboard', () => ({
  default: () => <div>Dashboard</div>,
}))

vi.mock('./KanbanBoard', () => ({ default: () => <div>Kanban</div> }))
vi.mock('./ContactList', () => ({ default: () => <div>Contacts</div> }))
vi.mock('./ContactDetail', () => ({ default: () => <div>Contact Detail</div> }))
vi.mock('./DealDetail', () => ({ default: () => <div>Deal Detail</div> }))
vi.mock('./ActivityFeed', () => ({ default: () => <div>Activities</div> }))
vi.mock('./Login', () => ({ default: () => <div>Login</div> }))
vi.mock('./FeedbackButton', () => ({ default: () => null }))

import { useAuth } from '../context/AuthContext'

describe('ProtectedRoute on /users', () => {
  it('admin user can access /users route', () => {
    useAuth.mockReturnValue({
      user: { name: 'Admin', role: 'admin', org_id: 1 },
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/users']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('User Management Page')).toBeInTheDocument()
  })

  it('non-admin user sees Access Denied on /users route', () => {
    useAuth.mockReturnValue({
      user: { name: 'Rep', role: 'rep', org_id: 1 },
      loading: false,
    })
    render(
      <MemoryRouter initialEntries={['/users']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/Access Denied/)).toBeInTheDocument()
  })
})
