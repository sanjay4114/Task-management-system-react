import { Link, NavLink, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'

export default function Navbar({ pillText = 'Task Management System', brandHref = '#top', links = [] }) {
  const location = useLocation()
  const currentHash = location.hash || ''

  function isHashLinkActive(link) {
    const targetHash = String(link?.href || '')
    if (!targetHash.startsWith('#')) return false
    if (currentHash) return currentHash === targetHash
    return Boolean(link?.defaultActive)
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark navbar-custom fixed-top">
      <div className="container">
        <a className="navbar-brand d-flex align-items-center" href={brandHref}>
          <span className="brand-icon">
            <i className="bi bi-check2-square"></i>
          </span>
          <div className="d-flex flex-column">
            <span className="fw-semibold">TaskFlow</span>
            <span className="logo-pill">{pillText}</span>
          </div>
        </a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse justify-content-end" id="navbarContent">
          <ul className="navbar-nav mb-2 mb-lg-0">
            {links.map((l) => {
              if (l.type === 'hash') {
                return (
                  <li className="nav-item" key={l.key}>
                    <a className={`nav-link ${isHashLinkActive(l) ? 'active' : ''}`.trim()} href={l.href}>
                      {l.label}
                    </a>
                  </li>
                )
              }

              if (l.type === 'route') {
                return (
                  <li className="nav-item" key={l.key}>
                    <NavLink className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`.trim()} to={l.to}>
                      {l.label}
                    </NavLink>
                  </li>
                )
              }

              if (l.type === 'link') {
                return (
                  <li className="nav-item" key={l.key}>
                    <Link className="nav-link" to={l.to}>
                      {l.label}
                    </Link>
                  </li>
                )
              }

              return null
            })}

            <li className="nav-item">
              <ThemeToggle />
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

