import React, { useState } from 'react'

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'ui_ux', label: 'UI/UX' },
  { value: 'performance', label: 'Performance' },
  { value: 'question', label: 'Question' },
  { value: 'other', label: 'Other' },
]

const WEBHOOK_URL = 'http://localhost:3002/api/v1/webhook/feedback'
const REPOSITORY_ID = 'f2f59c8a-b783-4a6d-a7ab-d05942b52f3a'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  function reset() {
    setFeedbackType('bug')
    setTitle('')
    setDescription('')
    setError(null)
    setSubmitted(false)
  }

  function handleClose() {
    setOpen(false)
    setTimeout(reset, 200)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_id: REPOSITORY_ID,
          feedback_type: feedbackType,
          title,
          description,
        }),
      })

      if (!res.ok) throw new Error(`Server responded ${res.status}`)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button className="feedback-fab" onClick={() => setOpen(true)} title="Send Feedback">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Feedback
      </button>

      {open && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal feedback-modal" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="feedback-success">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h2>Thanks for your feedback!</h2>
                <p>Your submission has been received.</p>
                <button className="btn btn-primary" onClick={handleClose}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2>Send Feedback</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                  <label>Type</label>
                  <select value={feedbackType} onChange={e => setFeedbackType(e.target.value)}>
                    {FEEDBACK_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Brief summary"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe in detail..."
                    rows={4}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
