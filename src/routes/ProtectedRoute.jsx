import { useContext } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'

export default function ProtectedRoute() {
  const { isAuthed } = useContext(AuthContext)
  const location = useLocation()

  if (!isAuthed) return <Navigate to="/" replace state={{ from: location }} />
  return <Outlet />
}

