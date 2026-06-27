import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function ContactList() {
  const [contacts, setContacts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadContacts()
  }, [page])  // BUG: search not in dependency array — changing search doesn't reload

  const loadContacts = async () => {
    try {
      const response = await api.listContacts({ page, search, per_page: 20 })
      setContacts(response.contacts)
      setTotal(response.total)
    } catch (err) {
      setError('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    // BUG: doesn't reset to page 1 when searching — may show empty results
    loadContacts()
  }

  const handleDelete = async (contactId) => {
    if (!window.confirm('Delete this contact?')) return

    try {
      await api.deleteContact(contactId)
      // BUG: removes from local state but doesn't update total count
      setContacts(prev => prev.filter(c => c.id !== contactId))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading">Loading contacts...</div>

  return (
    <div className="contacts-page">
      <div className="page-header">
        <h1>Contacts</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Contact
        </button>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Company</th>
            <th>Deals</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(contact => (
            <tr key={contact.id}>
              <td>
                <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
              </td>
              <td>{contact.email}</td>
              <td>{contact.phone}</td>
              <td>{contact.company}</td>
              <td>{contact.deal_count}</td>
              <td>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(contact.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={6} className="empty-state">No contacts found</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="pagination">
        <button
          className="btn btn-secondary"
          disabled={page <= 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {page} of {Math.ceil(total / 20) || 1}</span>
        <button
          className="btn btn-secondary"
          // BUG: uses total instead of Math.ceil(total / 20) for max page check
          disabled={page >= total}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>

      {showCreate && (
        <CreateContactModal
          onClose={() => setShowCreate(false)}
          onCreated={(contact) => {
            setContacts(prev => [contact, ...prev])
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}


function CreateContactModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    // BUG: allows empty name submission — no validation
    try {
      const contact = await api.createContact({ name, email, phone, company })
      onCreated(contact)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Contact</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Company</label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Contact</button>
          </div>
        </form>
      </div>
    </div>
  )
}
