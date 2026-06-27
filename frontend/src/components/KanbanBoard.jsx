import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

const STAGES = [
  { key: 'lead', label: 'Leads' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'closed_won', label: 'Closed Won' },
  { key: 'closed_lost', label: 'Closed Lost' },
]

export default function KanbanBoard() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [draggedDeal, setDraggedDeal] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortBy, setSortBy] = useState('value')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [error, setError] = useState('')
  // BUG: stale ref used in drag handler — captures initial deals state
  const dealsRef = useRef(deals)

  useEffect(() => {
    loadDeals()
  }, [])

  // BUG: dealsRef.current is updated AFTER render, creating a timing issue
  // where drag operations reference stale data
  useEffect(() => {
    dealsRef.current = deals
  }, [deals])

  const loadDeals = async () => {
    try {
      const response = await api.listDeals({ per_page: 100 })
      setDeals(response.deals)
    } catch (err) {
      setError('Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal)
    e.dataTransfer.effectAllowed = 'move'
    // BUG: stores deal ID as string but comparison later uses strict equality
    e.dataTransfer.setData('text/plain', deal.id)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = useCallback(async (e, targetStage) => {
    e.preventDefault()

    if (!draggedDeal) return
    if (draggedDeal.stage === targetStage) return

    const dealId = draggedDeal.id
    const previousStage = draggedDeal.stage

    // BUG: optimistic update — updates UI before server confirms
    // If the API call fails, the UI shows incorrect state
    setDeals(prev => prev.map(d =>
      d.id === dealId ? { ...d, stage: targetStage } : d
    ))

    try {
      await api.moveDeal(dealId, targetStage)
    } catch (err) {
      // BUG: rollback uses dealsRef which may be stale
      setDeals(dealsRef.current)
      setError(`Failed to move deal: ${err.message}`)
    }

    setDraggedDeal(null)
  }, [draggedDeal])

  const getDealsForStage = (stageKey) => {
    let stageDeals = deals.filter(d => d.stage === stageKey)

    if (filterAssigned) {
      stageDeals = stageDeals.filter(d =>
        // BUG: compares number (assigned_to) with string (filterAssigned) using ==
        d.assigned_to == filterAssigned
      )
    }

    // BUG: sorts by value as strings, not numbers — "9000" > "80000" alphabetically
    if (sortBy === 'value') {
      stageDeals.sort((a, b) => {
        if (typeof a.value === 'string' || typeof b.value === 'string') {
          return String(b.value).localeCompare(String(a.value))
        }
        return b.value - a.value
      })
    } else if (sortBy === 'priority') {
      // BUG: priority is a string, sorts lexicographically — "10" < "2"
      stageDeals.sort((a, b) => a.priority.localeCompare(b.priority))
    } else if (sortBy === 'created_at') {
      stageDeals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return stageDeals
  }

  const getStageTotal = (stageKey) => {
    const stageDeals = getDealsForStage(stageKey)
    return stageDeals.reduce((sum, d) => sum + d.value, 0)
  }

  const formatCurrency = (val) => '$' + val.toLocaleString()

  if (loading) return <div className="loading">Loading pipeline...</div>

  return (
    <div className="kanban-page">
      <div className="kanban-header">
        <h1>Deal Pipeline</h1>
        <div className="kanban-controls">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="value">Sort by Value</option>
            <option value="priority">Sort by Priority</option>
            <option value="created_at">Sort by Date</option>
          </select>
          <input
            type="text"
            placeholder="Filter by assigned user ID"
            value={filterAssigned}
            onChange={(e) => setFilterAssigned(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + New Deal
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="kanban-board">
        {STAGES.map(stage => {
          const stageDeals = getDealsForStage(stage.key)
          return (
            <div
              key={stage.key}
              className={`kanban-column kanban-column-${stage.key}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.key)}
            >
              <div className="kanban-column-header">
                <h3>{stage.label}</h3>
                <span className="deal-count">{stageDeals.length}</span>
                <span className="stage-total">{formatCurrency(getStageTotal(stage.key))}</span>
              </div>
              <div className="kanban-cards">
                {stageDeals.map(deal => (
                  <div
                    key={deal.id}
                    className="kanban-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal)}
                  >
                    <Link to={`/deals/${deal.id}`} className="deal-link">
                      <h4>{deal.title}</h4>
                    </Link>
                    <div className="deal-value">{formatCurrency(deal.value)}</div>
                    <div className="deal-meta">
                      <span className={`priority priority-${deal.priority}`}>
                        P{deal.priority}
                      </span>
                      {deal.assigned_user_name && (
                        <span className="assigned-to">{deal.assigned_user_name}</span>
                      )}
                    </div>
                    {deal.contact_name && (
                      <div className="deal-contact">{deal.contact_name}</div>
                    )}
                    {deal.expected_close_date && (
                      <div className="deal-date">Close: {deal.expected_close_date}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {showCreateModal && (
        <CreateDealModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newDeal) => {
            // BUG: appends the partial response from create API, which doesn't include
            // all fields like assigned_user_name, contact_name, etc.
            setDeals(prev => [...prev, newDeal])
            setShowCreateModal(false)
          }}
        />
      )}
    </div>
  )
}


function CreateDealModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState('lead')
  const [contactId, setContactId] = useState('')
  const [priority, setPriority] = useState('3')
  const [notes, setNotes] = useState('')
  const [expectedClose, setExpectedClose] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    // BUG: value parsed as float but empty string becomes NaN, no validation
    const dealData = {
      title,
      value: parseFloat(value),
      stage,
      contact_id: contactId ? parseInt(contactId) : null,
      priority,
      notes,
      expected_close_date: expectedClose || null,
    }

    try {
      const result = await api.createDeal(dealData)
      onCreated(result)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Create New Deal</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Value ($)</label>
            {/* BUG: type="text" allows non-numeric input, no validation */}
            <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Stage</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Contact ID</label>
            <input type="text" value={contactId} onChange={(e) => setContactId(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Priority (1-5)</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="1">1 - Critical</option>
              <option value="2">2 - High</option>
              <option value="3">3 - Medium</option>
              <option value="4">4 - Low</option>
              <option value="5">5 - Minimal</option>
            </select>
          </div>
          <div className="form-group">
            <label>Expected Close Date</label>
            <input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Deal</button>
          </div>
        </form>
      </div>
    </div>
  )
}
