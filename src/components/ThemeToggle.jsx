import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'theme'

export default function ThemeToggle({ className = 'nav-link btn-theme', buttonId, title = 'Toggle theme' }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const iconClass = useMemo(() => (theme === 'dark' ? 'bi bi-moon-stars' : 'bi bi-sun-fill'), [theme])

  return (
    <button
      id={buttonId}
      type="button"
      className={className}
      title={title}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    >
      <i className={iconClass}></i>
    </button>
  )
}

