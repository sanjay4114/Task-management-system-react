import { useContext, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AOS from 'aos'
import { AuthContext } from '../context/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { appendActivityLog } from '../activityLog.js'

import '../css/login.css'
import '../css/student-login.css'

function normalizeRole(roleParam) {
  const r = String(roleParam || '').toLowerCase()
  if (r === 'admin') return 'Admin'
  if (r === 'teacher') return 'Teacher'
  if (r === 'student') return 'Student'
  return null
}

function requiredBackendRole(role) {
  if (role === 'Admin') return 'ADMIN'
  if (role === 'Teacher') return 'TEACHER'
  if (role === 'Student') return 'STUDENT'
  return ''
}

export default function Login() {
  const { role: roleParam } = useParams()
  const role = normalizeRole(roleParam)
  const navigate = useNavigate()
  const { login } = useContext(AuthContext)

  const [loaderHidden, setLoaderHidden] = useState(false)
  const [pageTransitionActive, setPageTransitionActive] = useState(false)
  const [toast, setToast] = useState({ show: false, text: 'Signing you in…' })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '', form: '' })

  useEffect(() => {
    AOS.init({ once: true, offset: 40, easing: 'ease-out-cubic' })
    const t = window.setTimeout(() => setLoaderHidden(true), 600)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    setErrors({ email: '', password: '', form: '' })
    setPageTransitionActive(false)
    setToast({ show: false, text: 'Signing you in…' })
  }, [roleParam])

  const copy = useMemo(() => {
    if (role === 'Admin') {
      return {
        title: 'Admin Login',
        pill: 'Admin Console',
        badge: 'Secure Admin Access',
        subtitle:
          'Sign in to manage users, roles, and system-wide tasks from a single, secure dashboard.',
        emailLabel: 'Email address',
        emailPlaceholder: 'admin@organization.com',
        emailIconClass: 'bi bi-person-badge',
        submitIconClass: 'bi bi-shield-lock-fill',
        submitText: 'Sign in as Admin',
        footer: 'All actions are monitored and logged for compliance.',
      }
    }

    if (role === 'Teacher') {
      return {
        title: 'Teacher Login',
        pill: 'Teacher Workspace',
        badge: 'Teacher Portal',
        subtitle:
          'Access your classes, assignments, and student progress from a single, focused workspace.',
        emailLabel: 'Institutional email',
        emailPlaceholder: 'teacher@school.edu',
        emailIconClass: 'bi bi-person-lines-fill',
        submitIconClass: 'bi bi-person-check-fill',
        submitText: 'Sign in as Teacher',
        footer: 'Syncs automatically with your latest classes and schedules.',
      }
    }

    return {
      title: 'Student Login',
      pill: 'Student Space',
      badge: 'Student Portal',
      subtitle:
        'Log in to view your tasks, deadlines, and progress in a focused, distraction-free workspace.',
      emailLabel: 'Student ID or email',
      emailPlaceholder: 'student@school.edu',
      emailIconClass: 'bi bi-mortarboard',
      submitIconClass: 'bi bi-box-arrow-in-right',
      submitText: 'Sign in as Student',
      footer: 'Your progress is synced across devices in real time.',
    }
  }, [role])

  if (!role) {
    return (
      <main className="p-4">
        <p>Unknown role. Go back to <Link to="/">role selection</Link>.</p>
      </main>
    )
  }

  function validate() {
    const next = { email: '', password: '', form: '' }

    if (!email.trim()) next.email = role === 'Student' ? 'Please enter your student ID or email.' : 'Please enter a valid email.'
    else if (role !== 'Student') {
      // basic email format check (keeps behavior close to HTML email input)
      const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      if (!looksLikeEmail) next.email = 'Please enter a valid email.'
    }

    if (!password || password.length < 6) next.password = 'Password must be at least 6 characters.'

    setErrors(next)
    return !next.email && !next.password
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setToast({ show: true, text: role === 'Admin' ? 'Signing you in securely…' : role === 'Teacher' ? 'Signing you into your classes…' : 'Signing you into your tasks…' })
    setPageTransitionActive(true)
    setErrors((prev) => ({ ...prev, form: '' }))

    try {
      const loginPayload = { email: email.trim(), password };
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData || 'Invalid credentials or connection failed');
      }

      const authData = await res.json();
      
      // authData contains { token, id, email, name, role }
      const expected = requiredBackendRole(role);
      if (authData.role !== expected) {
        throw new Error(`Access denied: You are logged in as ${authData.role}, but need ${expected} access.`);
      }

      login({ 
        role, 
        email: authData.email, 
        rawUser: { ...authData, status: 'ONLINE' }, 
        token: authData.token 
      });

      appendActivityLog({
        action: `${role} logged in`,
        type: 'login',
        details: `${authData?.name || authData?.email || role} signed in`,
        user: {
          id: authData?.id ?? null,
          name: authData?.name || authData?.email || '',
          email: authData?.email || '',
          role: authData?.role || requiredBackendRole(role),
        },
      })

      navigate(`/dashboard/${encodeURIComponent(role.toLowerCase())}`, { replace: true });
    } catch (err) {
      setPageTransitionActive(false);
      setToast({ show: false, text: 'Signing you in…' });
      setPassword('');
      setErrors((prev) => ({ ...prev, form: err?.message || 'Login failed' }));
    }
  }

  const brandTo = '/'

  return (
    <>
      <div id="loader-overlay" aria-hidden="true" className={loaderHidden ? 'hidden' : ''}>
        <div className="loader" aria-label="Loading">
          <div className="loader-center-dot"></div>
        </div>
      </div>

      <div id="page-transition" className={pageTransitionActive ? 'active' : ''}></div>

      <nav className="navbar navbar-expand-lg navbar-dark navbar-custom fixed-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to={brandTo}>
            <span className="brand-icon">
              <i className="bi bi-check2-square"></i>
            </span>
            <div className="d-flex flex-column">
              <span className="fw-semibold">TaskFlow</span>
              <span className="logo-pill">{copy.pill}</span>
            </div>
          </Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse justify-content-end" id="navbarContent">
            <ul className="navbar-nav mb-2 mb-lg-0">
              <li className="nav-item">
                <a className="nav-link active" href="#login">
                  {copy.title}
                </a>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/">
                  Change Role
                </Link>
              </li>
              <li className="nav-item">
                <ThemeToggle />
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main id="login">
        <section className="hero">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>

          <div className="container position-relative">
            <div className="row justify-content-center">
              <div className="col-lg-6 col-xl-5">
                <div className="glass-panel" data-aos="fade-up" data-aos-duration="900">
                  <div className="panel-header text-center mb-4">
                    <div className="badge-pill">
                      <span className="badge-dot"></span>
                      {copy.badge}
                    </div>
                    <h1 className="panel-title">{copy.title}</h1>
                    <p className="panel-subtitle">{copy.subtitle}</p>
                  </div>

                  <form noValidate onSubmit={onSubmit}>
                    <div className="mb-3">
                      <label className="form-label">
                        <i className={`bi ${role === 'Student' ? 'bi-person-badge' : 'bi-envelope'} me-1`}></i>
                        {copy.emailLabel}
                      </label>
                      <div className="input-wrapper">
                        <input
                          type={role === 'Student' ? 'text' : 'email'}
                          className={`form-control ${errors.email ? 'is-invalid' : ''}`.trim()}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={copy.emailPlaceholder}
                          required
                        />
                        <span className="input-icon">
                          <i className={copy.emailIconClass}></i>
                        </span>
                      </div>
                      <div className="invalid-feedback">{errors.email || ' '}</div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        <i className="bi bi-lock me-1"></i>Password
                      </label>
                      <div className="input-wrapper">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`.trim()}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="input-icon-btn"
                          aria-label="Toggle password visibility"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          <i className={showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'}></i>
                        </button>
                      </div>
                      <div className="invalid-feedback">{errors.password || ' '}</div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="rememberMe"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="rememberMe">
                          {role === 'Admin' ? 'Remember this device' : 'Keep me signed in'}
                        </label>
                      </div>
                      <a href="#" className="link-forgot">
                        Forgot password?
                      </a>
                    </div>

                    <button type="submit" className="btn btn-neon w-100 mb-3">
                      <span className="btn-glow"></span>
                      <span className="btn-label">
                        <i className={`${copy.submitIconClass} me-2`}></i>
                        {copy.submitText}
                      </span>
                    </button>

                    <div className="text-center small-text mt-2">
                      <span>
                        Need another role?{' '}
                        <Link to="/" className="link-switch-role">
                          Go back to login selection
                        </Link>
                      </span>
                    </div>

                    {errors.form ? (
                      <div id="login-error-msg" className="text-danger mt-2 text-center small">
                        {errors.form}
                      </div>
                    ) : null}
                  </form>

                  <div className="small-meta mt-4">
                    {role === 'Admin' ? (
                      <>
                        <div className="meta-item">
                          <i className="bi bi-shield-check"></i>
                          SSO & MFA ready
                        </div>
                        <div className="meta-item">
                          <i className="bi bi-activity"></i>
                          Real-time activity logs
                        </div>
                      </>
                    ) : role === 'Teacher' ? (
                      <>
                        <div className="meta-item">
                          <i className="bi bi-calendar-check"></i>
                          Lesson planning ready
                        </div>
                        <div className="meta-item">
                          <i className="bi bi-people"></i>
                          Smart class overviews
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="meta-item">
                          <i className="bi bi-list-check"></i>
                          See all your tasks
                        </div>
                        <div className="meta-item">
                          <i className="bi bi-alarm"></i>
                          Stay on top of deadlines
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <p className="footer-text text-center mt-3">{copy.footer}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className={`selection-toast ${toast.show ? 'show' : ''}`.trim()} role="status" aria-live="polite">
        <i className="bi bi-check-circle-fill"></i>
        <span>{toast.text}</span>
      </div>
    </>
  )
}

