import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.getMe()
        .then((userData) => {
          setUser(userData)
        })
        .catch(() => {
          // BUG: clears token on ANY error, including network issues
          // Could log out user during temporary connectivity problems
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    // BUG: no cleanup — if component unmounts during fetch, state update on unmounted component
  }, [])

  const login = async (email, password) => {
    const response = await api.login(email, password)
    localStorage.setItem('token', response.access_token)
    setUser(response.user)
    return response.user
  }

  const register = async (data) => {
    const response = await api.register(data)
    localStorage.setItem('token', response.access_token)
    setUser(response.user)
    return response.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    // BUG: doesn't invalidate the token server-side — token is still valid until expiry
  }

  const updateCurrentUser = (updates) => {
    // BUG: optimistically updates user state without server confirmation
    setUser((prev) => ({ ...prev, ...updates }))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateCurrentUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
