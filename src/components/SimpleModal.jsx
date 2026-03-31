import { useEffect } from 'react'

export default function SimpleModal({ open, onClose, labelledBy, children, className = '' }) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div
        className={`modal fade show ${className}`.trim()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ display: 'block' }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
      >
        {children}
      </div>
    </>
  )
}

