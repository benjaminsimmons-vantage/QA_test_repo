import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // BUG: no debounce — double-click submits twice
    setSubmitting(true)

    try {
      if (isRegister) {
        // BUG: hardcoded org_id=1 for all registrations
        await register({ email, password, name, org_id: 1 })
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
    // BUG: setSubmitting(false) should be in finally block
    // If navigate succeeds, this line still runs on unmounted component
    setSubmitting(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>DealFlow CRM</h1>
        <h2>{isRegister ? 'Create Account' : 'Sign In'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            {/* BUG: no type="email" — no browser validation */}
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          {/* BUG: button not disabled while submitting — allows double submit */}
          <button type="submit" className="btn btn-primary btn-full">
            {isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <p className="toggle-auth">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          <button
            className="btn-link"
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
            }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </p>

        <div className="demo-credentials">
          <p><strong>Demo accounts:</strong></p>
          <p>Admin: admin@acme.com / admin123</p>
          <p>Manager: manager@acme.com / manager123</p>
          <p>Rep: rep1@acme.com / rep123</p>
        </div>
      </div>
    </div>
  )
}
