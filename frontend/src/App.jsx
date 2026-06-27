import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import KanbanBoard from './components/KanbanBoard'
import ContactList from './components/ContactList'
import ContactDetail from './components/ContactDetail'
import DealDetail from './components/DealDetail'
import UserManagement from './components/UserManagement'
import ActivityFeed from './components/ActivityFeed'
import Navbar from './components/Navbar'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  // BUG: role check uses case-sensitive comparison, but roles from API may vary in casing
  if (requiredRole && user.role !== requiredRole) {
    return <div className="error-page">Access Denied: Requires {requiredRole} role</div>
  }

  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading DealFlow CRM...</div>
  }

  return (
    <div className="app">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/pipeline" element={
            <ProtectedRoute><KanbanBoard /></ProtectedRoute>
          } />
          <Route path="/deals/:id" element={
            <ProtectedRoute><DealDetail /></ProtectedRoute>
          } />
          <Route path="/contacts" element={
            <ProtectedRoute><ContactList /></ProtectedRoute>
          } />
          <Route path="/contacts/:id" element={
            <ProtectedRoute><ContactDetail /></ProtectedRoute>
          } />
          <Route path="/activities" element={
            <ProtectedRoute><ActivityFeed /></ProtectedRoute>
          } />
          <Route path="/users" element={
            // BUG: requires "admin" (lowercase) but seed data has "Admin"
            <ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>
          } />
          {/* BUG: no 404 catch-all route */}
        </Routes>
      </main>
    </div>
  )
}
