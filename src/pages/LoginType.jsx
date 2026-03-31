import { useEffect, useMemo, useState } from 'react'
import AOS from 'aos'
import Navbar from '../components/Navbar.jsx'
import RoleCard from '../components/RoleCard.jsx'

import '../css/login-type.css'

export default function LoginType() {
  const [loaderHidden, setLoaderHidden] = useState(false)
  const [pageTransitionActive, setPageTransitionActive] = useState(false)
  const [toast, setToast] = useState({ show: false, text: 'Redirecting…' })

  useEffect(() => {
    AOS.init({ once: true, offset: 40, easing: 'ease-out-cubic' })
    const t = window.setTimeout(() => setLoaderHidden(true), 600)
    return () => window.clearTimeout(t)
  }, [])

  const navLinks = useMemo(
    () => [
      { key: 'login-types', type: 'hash', href: '#select-login', label: 'Login Types', defaultActive: true },
      { key: 'overview', type: 'hash', href: '#about-section', label: 'Overview' },
    ],
    [],
  )

  function handleSelect(role) {
    setToast({ show: true, text: `${role} login selected. Preparing secure session…` })
    setPageTransitionActive(true)
  }

  return (
    <>
      <div id="loader-overlay" aria-hidden="true" className={loaderHidden ? 'hidden' : ''}>
        <div className="loader" aria-label="Loading">
          <div className="loader-center-dot"></div>
        </div>
      </div>

      <div id="page-transition" className={pageTransitionActive ? 'active' : ''}></div>

      <Navbar pillText="Task Management System" brandHref="#top" links={navLinks} />

      <main id="top">
        <section className="hero" id="select-login">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>

          <div className="container position-relative">
            <div className="row justify-content-center">
              <div className="col-xl-9 col-lg-10">
                <div className="glass-panel" data-aos="fade-up" data-aos-duration="900">
                  <div className="row g-4 align-items-center">
                    <div className="col-lg-5">
                      <span className="glass-badge">
                        <span className="glass-badge-dot"></span>
                        Secure Smart Workspace
                      </span>
                      <h1 className="hero-title mb-2">
                        Select your <span className="highlight">login type</span>
                      </h1>
                      <p className="hero-subtitle">
                        A centralized, role-based task management experience designed for administrators, teachers, and
                        students — optimized for clarity, speed, and focus.
                      </p>

                      <div className="hero-cta-badge">
                        <i className="bi bi-shield-lock"></i>
                        SSO-ready · 256-bit encryption · Activity insights
                      </div>

                      <p className="footer-text mb-0">
                        Tip: Hover or tap a card to explore role capabilities. <span>Click to continue to the respective login.</span>
                      </p>
                    </div>

                    <div className="col-lg-7">
                      <div className="row g-3 g-md-4 mt-2 mt-lg-0">
                        <RoleCard
                          role="Admin"
                          title="Admin Login"
                          description="Configure workspaces, manage roles, and monitor productivity across the entire institution with granular insights and audit trails."
                          iconClass="bi bi-shield-shaded"
                          iconVariantClass=""
                          metaLeft={{ iconClass: 'bi bi-lightning-charge', text: 'Full control' }}
                          metaRight="System-wide access"
                          colClassName="col-md-12"
                          aos="fade-left"
                          aosDelay={50}
                          onSelect={handleSelect}
                          navigateDelayMs={800}
                        />

                        <RoleCard
                          role="Teacher"
                          title="Teacher Login"
                          description="Orchestrate lessons, assign tasks, and track learning outcomes with intuitive controls and smart reminders."
                          iconClass="bi bi-person-lines-fill"
                          iconVariantClass="teacher"
                          metaLeft={{ iconClass: 'bi bi-magic', text: 'Smart workflows' }}
                          metaRight="Class-level access"
                          colClassName="col-md-6"
                          aos="fade-up"
                          aosDelay={150}
                          onSelect={handleSelect}
                          navigateDelayMs={800}
                        />

                        <RoleCard
                          role="Student"
                          title="Student Login"
                          description="Stay on top of assignments, deadlines, and feedback in a distraction-free workspace tailored for focus."
                          iconClass="bi bi-mortarboard"
                          iconVariantClass="student"
                          metaLeft={{ iconClass: 'bi bi-clock-history', text: 'Daily agenda' }}
                          metaRight="Personal access"
                          colClassName="col-md-6"
                          aos="fade-up"
                          aosDelay={230}
                          onSelect={handleSelect}
                          navigateDelayMs={800}
                        />
                      </div>
                    </div>
                  </div>

                  <div id="admin-login"></div>
                  <div id="teacher-login"></div>
                  <div id="student-login"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="about-section"
          className="py-5 about-section"
          style={{ scrollMarginTop: 80 }}
        >
          <div className="container">
            <div className="row justify-content-center text-center">
              <div className="col-lg-8" data-aos="fade-up">
                <h2 className="mb-3" style={{ fontWeight: 600 }}>
                  Role-based access made simple
                </h2>
                <p className="about-subtitle mb-0">
                  This login selection screen is optimized for performance, clarity, and responsiveness. Wire it up to
                  your authentication routes by replacing the placeholder URLs in the JavaScript section with your real
                  login endpoints.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className={`selection-toast ${toast.show ? 'show' : ''}`.trim()} id="selection-toast" role="status" aria-live="polite">
        <i className="bi bi-check-circle-fill"></i>
        <span id="selection-toast-text">{toast.text}</span>
      </div>
    </>
  )
}

