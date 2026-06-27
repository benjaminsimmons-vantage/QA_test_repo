import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [deal, setDeal] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [newActivity, setNewActivity] = useState({ type: 'note', description: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDeal()
  }, [id])

  const loadDeal = async () => {
    try {
      const data = await api.getDeal(id)
      setDeal(data)
      setEditForm({
        title: data.title,
        value: data.value,
        stage: data.stage,
        notes: data.notes,
        priority: data.priority,
        expected_close_date: data.expected_close_date || '',
      })
    } catch (err) {
      setError('Deal not found')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.updateDeal(id, editForm)
      setEditing(false)
      // BUG: reloads entire deal but doesn't clear error state
      loadDeal()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async () => {
    // BUG: no confirmation dialog — accidental clicks delete the deal
    try {
      await api.deleteDeal(id)
      navigate('/pipeline')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddActivity = async (e) => {
    e.preventDefault()
    if (!newActivity.description.trim()) return

    try {
      await api.createActivity({
        ...newActivity,
        deal_id: parseInt(id),
      })
      setNewActivity({ type: 'note', description: '' })
      loadDeal()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading">Loading deal...</div>
  if (error && !deal) return <div className="error-page">{error}</div>
  if (!deal) return null

  return (
    <div className="deal-detail">
      <div className="deal-detail-header">
        <button className="btn btn-secondary" onClick={() => navigate('/pipeline')}>
          &larr; Back to Pipeline
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

      <div className="deal-detail-body">
        <div className="deal-detail-main">
          {editing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Value ($)</label>
                <input
                  type="number"
                  value={editForm.value}
                  onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select
                  value={editForm.stage}
                  onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
                >
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - Low</option>
                  <option value="5">5 - Minimal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Expected Close Date</label>
                <input
                  type="date"
                  value={editForm.expected_close_date}
                  onChange={(e) => setEditForm({ ...editForm, expected_close_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={5}
                />
              </div>
            </div>
          ) : (
            <>
              <h1>{deal.title}</h1>
              <div className="deal-info-grid">
                <div className="info-item">
                  <label>Value</label>
                  <span>${deal.value.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <label>Stage</label>
                  <span className={`stage-badge stage-${deal.stage}`}>{deal.stage}</span>
                </div>
                <div className="info-item">
                  <label>Priority</label>
                  <span className={`priority priority-${deal.priority}`}>P{deal.priority}</span>
                </div>
                <div className="info-item">
                  <label>Assigned To</label>
                  <span>{deal.assigned_user_name || 'Unassigned'}</span>
                </div>
                <div className="info-item">
                  <label>Contact</label>
                  <span>{deal.contact_name || 'None'}</span>
                </div>
                <div className="info-item">
                  <label>Expected Close</label>
                  <span>{deal.expected_close_date || 'Not set'}</span>
                </div>
                <div className="info-item">
                  <label>Created</label>
                  <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="deal-notes">
                <h3>Notes</h3>
                {/* BUG: XSS vulnerability — renders HTML directly from deal notes */}
                <div dangerouslySetInnerHTML={{ __html: deal.notes }} />
              </div>
            </>
          )}
        </div>

        <div className="deal-detail-sidebar">
          <div className="sidebar-section">
            <h3>Stage History</h3>
            <div className="stage-history">
              {deal.stage_history?.map((h, i) => (
                <div key={i} className="history-item">
                  <span className="history-stages">
                    {h.from_stage || 'New'} &rarr; {h.to_stage}
                  </span>
                  <span className="history-date">
                    {new Date(h.changed_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Activities</h3>
            <form onSubmit={handleAddActivity} className="activity-form">
              <select
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>
              <textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                placeholder="Add activity..."
                rows={2}
              />
              <button type="submit" className="btn btn-primary btn-sm">Add</button>
            </form>
            <div className="activity-list">
              {deal.activities?.map(a => (
                <div key={a.id} className="activity-item">
                  <span className={`activity-type type-${a.type}`}>{a.type}</span>
                  <p>{a.description}</p>
                  <span className="activity-meta">
                    {a.user_name} · {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
