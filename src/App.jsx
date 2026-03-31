import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import LoginType from './pages/LoginType.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import { ToastContainer } from './components/Toast.jsx'

export default function App() {
  return (
    <>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<LoginType />} />
        <Route path="/login/:role" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard/:role" element={<Dashboard />} />
        </Route>
      </Routes>
    </>
  )
}
