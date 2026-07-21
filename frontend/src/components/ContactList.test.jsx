import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api', () => ({
  api: {
    listContacts: vi.fn(),
    deleteContact: vi.fn(),
  },
}))

import { api } from '../api'
import ContactList from './ContactList'

function makeContacts(count, startId = 1) {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Contact ${startId + i}`,
    email: `c${startId + i}@example.com`,
    phone: '555-0100',
    company: 'Acme',
    deal_count: 0,
  }))
}

function renderContactList() {
  return render(
    <MemoryRouter>
      <ContactList />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  window.confirm = vi.fn(() => true)
})

describe('ContactList pagination', () => {
  it('disables Next button on last page (25 contacts, page 2)', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(5), total: 25 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeTruthy())

    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(nextBtn.disabled).toBe(false)

    await userEvent.click(nextBtn)

    api.listContacts.mockResolvedValue({ contacts: makeContacts(5, 21), total: 25 })
    await waitFor(() => expect(screen.getByText('Page 2 of 2')).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
  })

  it('enables Next button when more pages exist (25 contacts, page 1)', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 25 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(false)
  })

  it('disables Previous button on page 1', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 25 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Previous' }).disabled).toBe(true)
  })

  it('shows correct page indicator text', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 25 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeTruthy())
  })

  it('shows "Page 1 of 1" with zero contacts and both buttons disabled', async () => {
    api.listContacts.mockResolvedValue({ contacts: [], total: 0 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 1')).toBeTruthy())

    expect(screen.getByRole('button', { name: 'Previous' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
  })
})

describe('ContactList search', () => {
  it('resets to page 1 when submitting a search', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 45 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeTruthy())

    const nextBtn = screen.getByRole('button', { name: 'Next' })
    await userEvent.click(nextBtn)

    api.listContacts.mockResolvedValue({ contacts: makeContacts(20, 21), total: 45 })
    await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeTruthy())

    const searchInput = screen.getByPlaceholderText('Search contacts...')
    await userEvent.type(searchInput, 'test')

    api.listContacts.mockResolvedValue({ contacts: makeContacts(3), total: 3 })
    const searchBtn = screen.getByRole('button', { name: 'Search' })
    await userEvent.click(searchBtn)

    await waitFor(() => expect(screen.getByText('Page 1 of 1')).toBeTruthy())
  })

  it('triggers reload when search term changes via useEffect', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 25 })

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeTruthy())

    const callCountBefore = api.listContacts.mock.calls.length

    api.listContacts.mockResolvedValue({ contacts: makeContacts(2), total: 2 })
    const searchInput = screen.getByPlaceholderText('Search contacts...')
    await userEvent.clear(searchInput)
    await userEvent.type(searchInput, 'x')

    await waitFor(() => {
      expect(api.listContacts.mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })
})

describe('ContactList delete', () => {
  it('re-fetches contacts after deleting a contact', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 25 })
    api.deleteContact.mockResolvedValue({})

    renderContactList()
    await waitFor(() => expect(screen.getByText('Contact 1')).toBeTruthy())

    api.listContacts.mockResolvedValue({ contacts: makeContacts(19, 2), total: 24 })

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(api.deleteContact).toHaveBeenCalledWith(1)
      expect(api.listContacts.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('navigates back when deleting the last contact on last page', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 21 })
    api.deleteContact.mockResolvedValue({})

    renderContactList()
    await waitFor(() => expect(screen.getByText('Page 1 of 2')).toBeTruthy())

    const nextBtn = screen.getByRole('button', { name: 'Next' })
    await userEvent.click(nextBtn)

    api.listContacts.mockResolvedValue({ contacts: makeContacts(1, 21), total: 21 })
    await waitFor(() => expect(screen.getByText('Page 2 of 2')).toBeTruthy())

    api.listContacts.mockResolvedValue({ contacts: makeContacts(20), total: 20 })
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    await userEvent.click(deleteButtons[0])

    await waitFor(() => expect(screen.getByText('Page 1 of 1')).toBeTruthy())
  })

  it('shows "Page 1 of 1" after deleting the only remaining contact', async () => {
    api.listContacts.mockResolvedValue({ contacts: makeContacts(1), total: 1 })
    api.deleteContact.mockResolvedValue({})

    renderContactList()
    await waitFor(() => expect(screen.getByText('Contact 1')).toBeTruthy())

    api.listContacts.mockResolvedValue({ contacts: [], total: 0 })
    const deleteBtn = screen.getByRole('button', { name: 'Delete' })
    await userEvent.click(deleteBtn)

    await waitFor(() => expect(screen.getByText('Page 1 of 1')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Next' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Previous' }).disabled).toBe(true)
  })
})
