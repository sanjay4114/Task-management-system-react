const ACTIVITY_LOG_KEY = 'v2_activityLogs'

function safeReadLogs() {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY)
    if (raw == null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeWriteLogs(logs) {
  try {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs))
  } catch {
    // ignore storage write failures
  }
}

export function appendActivityLog({ action, type = 'system', details = '', user = null, timestamp = null }) {
  const nextLog = {
    timestamp: timestamp || new Date().toISOString(),
    user,
    action: String(action || 'Activity'),
    type: String(type || 'system').toLowerCase(),
    details: String(details || ''),
  }

  const prev = safeReadLogs()
  const merged = [nextLog, ...prev]
  safeWriteLogs(merged)
  return nextLog
}

