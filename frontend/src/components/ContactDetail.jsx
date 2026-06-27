import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadContact()
  }, [id])

  const loadContact = async () => {
    try {
      const data = await api.getContact(id)
      setContact(data)
      setEditForm({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
      })
    } catch (err) {
      setError('Contact not found')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.updateContact(id, editForm)
      setEditing(false)
      loadContact()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this contact? Associated deals will lose their contact reference.')) return
    try {
      await api.deleteContact(id)
      navigate('/contacts')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading">Loading contact...</div>
  if (!contact) return <div className="error-page">{error || 'Contact not found'}</div>

  return (
    <div className="contact-detail">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/contacts')}>
          &larr; Back to Contacts
        </button>
        <div className="deal-actions">
          {editing ? (
            <>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="contact-detail-body">
        <div className="contact-info">
          {editing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="text"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <>
              <h1>{contact.name}</h1>
              <div className="deal-info-grid">
                <div className="info-item">
                  <label>Email</label>
                  <span>{contact.email || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <span>{contact.phone || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <label>Company</label>
                  <span>{contact.company || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <label>Created</label>
                  <span>{new Date(contact.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="contact-deals">
          <h2>Associated Deals</h2>
          {contact.deals?.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Stage</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {contact.deals.map(deal => (
                  <tr key={deal.id}>
                    <td><Link to={`/deals/${deal.id}`}>{deal.title}</Link></td>
                    <td><span className={`stage-badge stage-${deal.stage}`}>{deal.stage}</span></td>
                    <td>${deal.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No deals associated with this contact</p>
          )}
        </div>

        <div className="contact-activities">
          <h2>Activity History</h2>
          {contact.activities?.length > 0 ? (
            <div className="activity-list">
              {contact.activities.map(a => (
                <div key={a.id} className="activity-item">
                  <span className={`activity-type type-${a.type}`}>{a.type}</span>
                  <p>{a.description}</p>
                  <span className="activity-meta">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No activities recorded</p>
          )}
        </div>
      </div>
    </div>
  )
}
