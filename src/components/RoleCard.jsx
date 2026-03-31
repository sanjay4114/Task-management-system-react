import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RoleCard({
  role,
  title,
  description,
  iconClass,
  iconVariantClass = '',
  metaLeft,
  metaRight,
  aos,
  aosDelay,
  colClassName,
  onSelect,
  navigateDelayMs = 0,
}) {
  const navigate = useNavigate()
  const [ripple, setRipple] = useState(null)

  const dataAosProps = useMemo(() => {
    if (!aos) return {}
    const props = { 'data-aos': aos }
    if (typeof aosDelay === 'number') props['data-aos-delay'] = aosDelay
    return props
  }, [aos, aosDelay])

  function onClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    setRipple({ x: clickX, y: clickY, id: crypto?.randomUUID?.() || String(Date.now()) })

    onSelect?.(role)

    const to = `/login/${encodeURIComponent(role.toLowerCase())}`
    if (navigateDelayMs > 0) {
      window.setTimeout(() => navigate(to), navigateDelayMs)
    } else {
      navigate(to)
    }
  }

  return (
    <div className={colClassName} {...dataAosProps}>
      <div className="role-card" data-role={role} role="button" tabIndex={0} onClick={onClick}>
        {title === 'Admin Login' ? (
          <div className="d-flex align-items-start justify-content-between">
            <div>
              <div className={`role-icon ${iconVariantClass}`.trim()}>
                <i className={iconClass}></i>
              </div>
              <h3 className="role-title">{title}</h3>
              <p className="role-desc">{description}</p>
            </div>
            <div className="role-arrow">
              <i className="bi bi-arrow-right"></i>
            </div>
          </div>
        ) : (
          <>
            <div className={`role-icon ${iconVariantClass}`.trim()}>
              <i className={iconClass}></i>
            </div>
            <h3 className="role-title">{title}</h3>
            <p className="role-desc">{description}</p>
          </>
        )}

        <div className={`role-meta ${title === 'Admin Login' ? 'mt-1' : ''}`.trim()}>
          <span className="role-chip">
            <i className={metaLeft?.iconClass}></i>
            {metaLeft?.text}
          </span>
          <span>{metaRight}</span>
        </div>

        {ripple ? (
          <span
            key={ripple.id}
            className="ripple"
            style={{ left: ripple.x, top: ripple.y }}
            onAnimationEnd={() => setRipple(null)}
          />
        ) : null}
      </div>
    </div>
  )
}

