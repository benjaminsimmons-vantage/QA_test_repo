import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api', () => ({
  api: {
    listContacts: vi.fn(),
  },
}))

import { api } from '../api'
import ContactList, { PER_PAGE } from './ContactList'

function renderContactList() {
  return render(
    <MemoryRouter>
      <ContactList />
    </MemoryRouter>
  )
}

describe('ContactList pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disables both buttons and shows "Page 1 of 1" with zero contacts', async () => {
    api.listContacts.mockResolvedValue({ contacts: [], total: 0, page: 1, per_page: PER_PAGE, total_pages: 1 })

    renderContactList()

    const prev = await screen.findByRole('button', { name: /previous/i })
    const next = screen.getByRole('button', { name: /next/i })

    expect(prev.disabled).toBe(true)
    expect(next.disabled).toBe(true)
    expect(screen.getByText('Page 1 of 1')).toBeTruthy()
  })

  it('disables Next when contacts fit on a single page', async () => {
    const contacts = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: `Contact ${i + 1}`,
      email: `c${i + 1}@test.com`,
      phone: '555-0000',
      company: 'Acme',
      deal_count: 0,
    }))
    api.listContacts.mockResolvedValue({ contacts, total: 5, page: 1, per_page: PER_PAGE, total_pages: 1 })

    renderContactList()

    const next = await screen.findByRole('button', { name: /next/i })
    expect(next.disabled).toBe(true)
    expect(screen.getByText('Page 1 of 1')).toBeTruthy()
  })

  it('enables Next on non-last pages and disables on last page', async () => {
    const contacts = Array.from({ length: PER_PAGE }, (_, i) => ({
      id: i + 1,
      name: `Contact ${i + 1}`,
      email: `c${i + 1}@test.com`,
      phone: '555-0000',
      company: 'Acme',
      deal_count: 0,
    }))
    api.listContacts.mockResolvedValue({ contacts, total: PER_PAGE + 5, page: 1, per_page: PER_PAGE, total_pages: 2 })

    renderContactList()

    const next = await screen.findByRole('button', { name: /next/i })
    expect(next.disabled).toBe(false)
    expect(screen.getByText(`Page 1 of 2`)).toBeTruthy()
  })

  it('disables Next on the last page of multi-page results', async () => {
    const page1Contacts = Array.from({ length: PER_PAGE }, (_, i) => ({
      id: i + 1,
      name: `Contact ${i + 1}`,
      email: `c${i + 1}@test.com`,
      phone: '555-0000',
      company: 'Acme',
      deal_count: 0,
    }))
    const page2Contacts = Array.from({ length: 5 }, (_, i) => ({
      id: PER_PAGE + i + 1,
      name: `Contact ${PER_PAGE + i + 1}`,
      email: `c${PER_PAGE + i + 1}@test.com`,
      phone: '555-0000',
      company: 'Acme',
      deal_count: 0,
    }))
    const total = PER_PAGE + 5
    api.listContacts
      .mockResolvedValueOnce({ contacts: page1Contacts, total, page: 1, per_page: PER_PAGE, total_pages: 2 })
      .mockResolvedValueOnce({ contacts: page2Contacts, total, page: 2, per_page: PER_PAGE, total_pages: 2 })

    renderContactList()

    const next = await screen.findByRole('button', { name: /next/i })
    expect(next.disabled).toBe(false)

    await userEvent.click(next)

    const nextAfter = await screen.findByRole('button', { name: /next/i })
    expect(nextAfter.disabled).toBe(true)
  })

  it('uses PER_PAGE constant in the API call', async () => {
    api.listContacts.mockResolvedValue({ contacts: [], total: 0, page: 1, per_page: PER_PAGE, total_pages: 1 })

    renderContactList()

    await screen.findByRole('button', { name: /previous/i })
    expect(api.listContacts).toHaveBeenCalledWith(
      expect.objectContaining({ per_page: PER_PAGE })
    )
  })
})
