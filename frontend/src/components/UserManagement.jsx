import React, { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const { user: currentUser } = useAuth()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await api.listUsers()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId) => {
    try {
      await api.updateUser(userId, { role: editRole })
      setEditingId(null)
      loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await api.updateUser(userId, { is_active: currentStatus ? 0 : 1 })
      loadUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (userId) => {
    if (userId === currentUser.id) {
      setError("Cannot delete your own account")
      return
    }

    if (!window.confirm('Delete this user? This cannot be undone.')) return

    try {
      await api.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading">Loading users...</div>

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>User Management</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* BUG: displays password_hash from API response (API leaks it for all users) */}
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Organization</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className={!u.is_active ? 'inactive-row' : ''}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                {editingId === u.id ? (
                  <div className="inline-edit">
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      {/* BUG: options use lowercase but seed data has mixed casing */}
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="rep">Rep</option>
                    </select>
                    <button className="btn btn-sm btn-primary" onClick={() => handleRoleChange(u.id)}>
                      Save
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span
                    className="editable"
                    onClick={() => {
                      setEditingId(u.id)
                      setEditRole(u.role)
                    }}
                  >
                    {u.role}
                  </span>
                )}
              </td>
              {/* BUG: shows raw org_id instead of org name */}
              <td>{u.org_id}</td>
              <td>
                <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleToggleActive(u.id, u.is_active)}
                >
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(u.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
