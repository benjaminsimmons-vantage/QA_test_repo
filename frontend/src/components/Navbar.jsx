import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link'

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">DealFlow CRM</Link>
      </div>
      <div className="nav-links">
        <Link to="/" className={isActive('/')}>Dashboard</Link>
        <Link to="/pipeline" className={isActive('/pipeline')}>Pipeline</Link>
        <Link to="/contacts" className={isActive('/contacts')}>Contacts</Link>
        <Link to="/activities" className={isActive('/activities')}>Activities</Link>
        {/* BUG: shows "Users" link to everyone but the route requires admin role */}
        {/* No role check here means non-admins see the link but get "Access Denied" */}
        <Link to="/users" className={isActive('/users')}>Users</Link>
      </div>
      <div className="nav-user">
        <span className="user-info">{user?.name} ({user?.role})</span>
        <button onClick={logout} className="btn btn-logout">Logout</button>
      </div>
    </nav>
  )
}
