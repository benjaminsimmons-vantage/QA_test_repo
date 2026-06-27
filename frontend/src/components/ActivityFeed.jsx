import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadActivities()
  }, [])  // BUG: filterType not in dependency array — filter changes don't trigger reload

  const loadActivities = async () => {
    try {
      const data = await api.getActivityFeed(50)
      setActivities(data)
      setHasMore(data.length >= 50)
    } catch (err) {
      setError('Failed to load activities')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)

    try {
      const lastActivity = activities[activities.length - 1]
      // BUG: passes created_at which may not be in ISO format (backend returns str(datetime))
      const data = await api.getActivityFeed(50, lastActivity?.created_at)
      // BUG: doesn't deduplicate — if activities were added between loads, duplicates appear
      setActivities(prev => [...prev, ...data])
      setHasMore(data.length >= 50)
    } catch (err) {
      setError('Failed to load more activities')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleDelete = async (activityId) => {
    try {
      await api.deleteActivity(activityId)
      setActivities(prev => prev.filter(a => a.id !== activityId))
    } catch (err) {
      setError(err.message)
    }
  }

  const filteredActivities = filterType
    ? activities.filter(a => a.type === filterType)
    : activities

  const typeColors = {
    call: '#4CAF50',
    email: '#2196F3',
    meeting: '#FF9800',
    note: '#9C27B0',
    task: '#607D8B',
    stage_change: '#F44336',
  }

  if (loading) return <div className="loading">Loading activities...</div>

  return (
    <div className="activities-page">
      <div className="page-header">
        <h1>Activity Feed</h1>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="call">Calls</option>
          <option value="email">Emails</option>
          <option value="meeting">Meetings</option>
          <option value="note">Notes</option>
          <option value="task">Tasks</option>
          <option value="stage_change">Stage Changes</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="activity-feed">
        {filteredActivities.map(activity => (
          <div key={activity.id} className="feed-item">
            <div
              className="feed-icon"
              style={{ backgroundColor: typeColors[activity.type] || '#999' }}
            >
              {activity.type.charAt(0).toUpperCase()}
            </div>
            <div className="feed-content">
              <div className="feed-header">
                <span className="feed-user">{activity.user_name}</span>
                <span className="feed-type">{activity.type}</span>
                <span className="feed-time">
                  {/* BUG: date parsing may fail on backend's str(datetime) format */}
                  {formatRelativeTime(activity.created_at)}
                </span>
              </div>
              <p className="feed-description">{activity.description}</p>
              <div className="feed-links">
                {activity.deal_title && (
                  <span className="feed-deal">Deal: {activity.deal_title}</span>
                )}
                {activity.contact_name && (
                  <span className="feed-contact">Contact: {activity.contact_name}</span>
                )}
              </div>
            </div>
            <button
              className="btn btn-sm btn-danger feed-delete"
              onClick={() => handleDelete(activity.id)}
            >
              &times;
            </button>
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="empty-state">No activities found</div>
        )}

        {hasMore && (
          <button
            className="btn btn-secondary btn-full"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  )
}


function formatRelativeTime(dateStr) {
  // BUG: assumes dateStr is always parseable — backend returns str(datetime) which
  // may not be standard ISO format
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  // BUG: doesn't handle future dates (negative diff) — shows "NaN minutes ago"
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}
