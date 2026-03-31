import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import SimpleModal from '../components/SimpleModal.jsx'
import * as api from '../api'
import { toast } from '../toast.js'
import { appendActivityLog } from '../activityLog.js'



function safeNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapBackendRole(role) {
  const r = String(role || '').toUpperCase()
  if (r.includes('ADMIN')) return 'Admin'
  if (r.includes('TEACHER')) return 'Teacher'
  if (r.includes('STUDENT')) return 'Student'
  return r || ''
}

function mapBackendUserStatus(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'ONLINE') return 'Online'
  if (s === 'ACTIVE') return 'Active'
  if (s === 'INACTIVE') return 'Inactive'
  return s || ''
}

function toBackendRole(role) {
  if (!role) return 'STUDENT'
  return role.toUpperCase()
}

function toBackendStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'online') return 'ONLINE'
  if (s === 'active') return 'ACTIVE'
  if (s === 'inactive' || s === 'invited') return 'INACTIVE'
  return 'ACTIVE'
}

function mapBackendTaskStatus(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'ACTIVE') return 'Active'
  if (s === 'COMPLETED') return 'Completed'
  if (s === 'UPCOMING') return 'Upcoming'
  if (s === 'PENDING') return 'Pending'
  if (s === 'SCHEDULED') return 'Scheduled'
  return s || ''
}

function mapBackendExamStatus(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'COMPLETED') return 'Completed'
  if (s === 'ACTIVE') return 'Active'
  return 'Scheduled'
}

function mapBackendAttendanceStatus(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'PRESENT') return 'Present'
  if (s === 'ABSENT') return 'Absent'
  if (s === 'LATE') return 'Late'
  if (s === 'EXCUSED') return 'Excused'
  return s || ''
}

function formatBackendDateTime(ts) {
  const raw = ts == null ? '' : String(ts)
  if (!raw) return ''
  if (raw.includes('T')) return raw.replace('T', ' ')
  return raw
}

function toIsoTimestamp(value) {
  if (!value) return new Date().toISOString()
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  return String(value)
}

function normalizeActivityLogItem(log) {
  const source = log && typeof log === 'object' ? log : {}
  const typeRaw = source.type ?? source.activityType ?? source.category ?? source.eventType ?? source.module ?? 'system'
  const actionRaw = source.action ?? source.event ?? source.title ?? source.activity ?? source.description ?? source.message ?? 'Activity'
  const detailsRaw = source.details ?? source.description ?? source.message ?? source.note ?? ''
  const timestampRaw = source.timestamp ?? source.createdAt ?? source.dateTime ?? source.date ?? source.time
  const userRaw = source.user ?? source.performedBy ?? source.actor ?? source.createdBy ?? null

  return {
    id: source.id ?? source.logId ?? `${String(actionRaw)}-${String(timestampRaw ?? '')}-${String(detailsRaw)}`,
    timestamp: toIsoTimestamp(timestampRaw),
    user: userRaw,
    action: String(actionRaw || 'Activity'),
    type: String(typeRaw || 'system').toLowerCase(),
    details: String(detailsRaw || ''),
  }
}

function extractActivityLogs(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.content)) return payload.content
  if (Array.isArray(payload.data)) return payload.data
  if (Array.isArray(payload.items)) return payload.items
  if (Array.isArray(payload.logs)) return payload.logs
  return []
}

function mergeActivityLogs(localLogs, remoteLogs) {
  const local = Array.isArray(localLogs) ? localLogs : []
  const remote = Array.isArray(remoteLogs) ? remoteLogs : []
  const normalized = [...remote, ...local].map(normalizeActivityLogItem)
  const deduped = []
  const seen = new Set()

  normalized.forEach((log) => {
    const key = `${log.id}|${log.timestamp}|${log.action}|${log.type}|${log.details}`
    if (seen.has(key)) return
    seen.add(key)
    deduped.push(log)
  })

  deduped.sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime()
    const bTime = new Date(b.timestamp).getTime()
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
  })

  return deduped
}



function normalizeRole(roleParam) {
  const r = String(roleParam || '').toLowerCase()
  if (r === 'admin') return 'Admin'
  if (r === 'teacher') return 'Teacher'
  if (r === 'student') return 'Student'
  return null
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return typeof defaultValue === 'function' ? defaultValue() : defaultValue
      return JSON.parse(raw)
    } catch {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [key, state])

  return [state, setState]
}

function useConfirmDialog() {
  const resolverRef = useRef(null)
  const [state, setState] = useState({
    open: false,
    title: 'Please confirm',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    confirmClass: 'btn-primary',
  })

  const requestConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        open: true,
        title: options.title || 'Please confirm',
        message: message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        confirmClass: options.confirmClass || 'btn-primary',
      })
    })
  }, [])

  const closeWith = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setState((prev) => ({ ...prev, open: false }))
    if (resolve) resolve(result)
  }, [])

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        resolverRef.current(false)
        resolverRef.current = null
      }
    }
  }, [])

  const modal = (
    <SimpleModal open={state.open} onClose={() => closeWith(false)} labelledBy="globalConfirmDialogTitle">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="globalConfirmDialogTitle">{state.title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={() => closeWith(false)}></button>
          </div>
          <div className="modal-body">
            <p className="mb-0">{state.message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => closeWith(false)}>
              {state.cancelLabel}
            </button>
            <button type="button" className={`btn ${state.confirmClass}`.trim()} onClick={() => closeWith(true)}>
              {state.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </SimpleModal>
  )

  return { requestConfirm, modal }
}

function AnimatedStatValue({ value }) {
  const [display, setDisplay] = useState(0)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
    let count = 0
    const target = Number(value) || 0
    const step = Math.max(1, Math.ceil(target / 40))
    const id = window.setInterval(() => {
      count += step
      if (count >= target) {
        setDisplay(target)
        window.clearInterval(id)
      } else {
        setDisplay(count)
      }
    }, 20)

    return () => window.clearInterval(id)
  }, [value])

  return <div className="stat-value">{display}</div>
}

function AdminDashboard({ onLogout }) {
  const { user } = useContext(AuthContext)
  const { requestConfirm, modal: confirmModal } = useConfirmDialog()


  useEffect(() => {
    import('../css/admin-dashboard.css')
  }, [])

  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState('sidebarCollapsed', false)
  const [activeSection, setActiveSection] = useState('overview')
  const [adminTasks, setAdminTasks] = useState([])

  const [users, setUsers] = useState([])
  useEffect(() => {
    if (!user?.token) return
    api.getUsers(user.token, onLogout)
      .then(data => setUsers(data || []))
      .catch(err => console.error(err))
  }, [user?.token, onLogout])

  const [courses, setCourses] = useState([])
  useEffect(() => {
    if (!user?.token) return
    api.getCourses(user.token, onLogout)
      .then(data => setCourses(data || []))
      .catch(err => console.error(err))
  }, [user?.token, onLogout])
  const [activityLogs, setActivityLogs] = useLocalStorageState('v2_activityLogs', () => {
    try {
      const oldRaw = localStorage.getItem('activityLogs')
      const oldLogs = oldRaw ? JSON.parse(oldRaw) : []
      return Array.isArray(oldLogs) ? oldLogs : []
    } catch {
      return []
    }
  })

  // Load persisted activity logs on admin login.
  useEffect(() => {
    if (!user?.token) return
    api.getActivityLogs(user.token, onLogout)
      .then((data) => {
        setActivityLogs((prev) => {
          const merged = mergeActivityLogs(prev, extractActivityLogs(data))
          if (merged.length > 0) return merged
          return mergeActivityLogs(
            [
              {
                timestamp: new Date().toISOString(),
                user: user?.rawUser || user || null,
                action: 'Admin session started',
                type: 'login',
                details: 'Signed in to Admin Dashboard',
              },
            ],
            merged
          )
        })
      })
      .catch((err) => console.error('Failed to load activity logs:', err))
  }, [user?.token, onLogout, setActivityLogs])

  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUsers, setSelectedUsers] = useState(() => new Set())
  const [addUserVisible, setAddUserVisible] = useState(false)

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('Student')
  const [newUserStatus, setNewUserStatus] = useState('Active')
  const [newUserCourse, setNewUserCourse] = useState('')

  const [addCourseVisible, setAddCourseVisible] = useState(false)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseSubject, setNewCourseSubject] = useState('')

  const [editCourseOpen, setEditCourseOpen] = useState(false)
  const [editCourseForm, setEditCourseForm] = useState({ id: null, name: '', subject: '' })

  const [editOpen, setEditOpen] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    role: 'Student',
    status: 'Active',
    joiningDate: '',
    qualification: '',
    notes: '',
  })

  const [logDateFilter, setLogDateFilter] = useState('')
  const [logTypeFilter, setLogTypeFilter] = useState('')

  useEffect(() => {
    document.title = 'Admin Dashboard – Task Management System'
  }, [])



  const taskQueueCounts = useMemo(() => {
    const tasks = adminTasks || []
    const backlog = tasks.filter((t) => String(t?.status || '').toUpperCase() === 'UPCOMING').length
    const inProgress = tasks.filter((t) => {
      const s = String(t?.status || '').toUpperCase()
      return s === 'ACTIVE' || s === 'SCHEDULED'
    }).length
    const blocked = tasks.filter((t) => String(t?.status || '').toUpperCase() === 'PENDING').length
    return { backlog, inProgress, blocked }
  }, [adminTasks])

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase()
    return users.filter((u) => {
      const name = String(u.fullName || u.name || '').toLowerCase()
      const email = String(u.email || '').toLowerCase()
      const matchSearch = !search || name.includes(search) || email.includes(search)
      const matchRole = !roleFilter || mapBackendRole(u.role) === roleFilter
      const matchStatus = !statusFilter || mapBackendUserStatus(u.status) === statusFilter
      return matchSearch && matchRole && matchStatus
    })
  }, [users, userSearch, roleFilter, statusFilter])

  useEffect(() => {
    setSelectedUsers(new Set())
  }, [userSearch, roleFilter, statusFilter, users.length])

  const checkedCount = useMemo(() => {
    let count = 0
    selectedUsers.forEach((idx) => {
      if (Number.isInteger(idx)) count += 1
    })
    return count
  }, [selectedUsers])

  const selectAllState = useMemo(() => {
    const indexes = filteredUsers.map((u) => users.indexOf(u)).filter((i) => i >= 0)
    const checked = indexes.filter((i) => selectedUsers.has(i)).length
    return { total: indexes.length, checked }
  }, [filteredUsers, users, selectedUsers])

  function roleBadge(role) {
    const r = mapBackendRole(role)
    if (r === 'Admin') return <span className="badge bg-primary">Admin</span>
    if (r === 'Teacher') return <span className="badge bg-info text-dark">Teacher</span>
    return <span className="badge bg-success">Student</span>
  }

  function toggleUserSelected(index, checked) {
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (checked) next.add(index)
      else next.delete(index)
      return next
    })
  }

  function onSelectAll(checked) {
    const indexes = filteredUsers.map((u) => users.indexOf(u)).filter((i) => i >= 0)
    setSelectedUsers((prev) => {
      const next = new Set(prev)
      if (checked) indexes.forEach((i) => next.add(i))
      else indexes.forEach((i) => next.delete(i))
      return next
    })
  }

  async function onBulkDelete() {
    if (selectedUsers.size === 0) return
    const accepted = await requestConfirm(`Delete ${selectedUsers.size} selected users?`, {
      title: 'Delete Users',
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    })
    if (!accepted) return

    const indices = Array.from(selectedUsers).sort((a, b) => b - a)
    setUsers((prev) => {
      const next = [...prev]
      indices.forEach((idx) => {
        if (idx >= 0 && idx < next.length) next.splice(idx, 1)
      })
      return next
    })
    setSelectedUsers(new Set())
  }

  async function onAddUserSubmit(e) {
    e.preventDefault()
    const name = newUserName.trim()
    const email = newUserEmail.trim()
    const password = newUserPassword.trim()
    if (!name || !email || !password) {
      toast.error("Please fill in Name, Email, and Password.")
      return
    }

    const req = {
      name,
      email,
      password,
      role: toBackendRole(newUserRole),
      status: toBackendStatus(newUserStatus),
      phone: '', dob: '',
      joiningDate: new Date().toISOString().split('T')[0],
      qualification: '', notes: ''
    }
    try {
      const added = await api.createUser(user.token, req, onLogout)
      if (newUserCourse && added.id) {
        if (req.role === 'TEACHER') {
          await api.assignTeacherToCourse(user.token, newUserCourse, added.id, onLogout)
        } else if (req.role === 'STUDENT') {
          await api.assignStudentToCourse(user.token, newUserCourse, added.id, onLogout)
        }
      }
      setUsers(prev => [...prev, added])
      appendLocalActivityLog({
        action: 'User created',
        type: 'user',
        details: `${added?.name || ''} (${added?.email || ''})`.trim() || 'User created'
      })
      setAddUserVisible(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserRole('Student')
      setNewUserStatus('Active')
      setNewUserCourse('')
    } catch (err) {
      console.error("Add user error:", err)
      toast.error("Failed to add user. Ensure the email is unique.");
    }
  }

  async function onAddCourseSubmit(e) {
    e.preventDefault()
    if (!newCourseName.trim()) { toast.error("Please enter a course name"); return }
    const req = { name: newCourseName, subject: newCourseSubject }
    try {
      const added = await api.createCourse(user.token, req, onLogout)
      setCourses(prev => [...prev, added])
      appendLocalActivityLog({
        action: 'Course created',
        type: 'task',
        details: `${added?.name || ''}`.trim() || 'Course created'
      })
      setAddCourseVisible(false)
      setNewCourseName('')
      setNewCourseSubject('')
    } catch (err) { console.error(err); toast.error("Failed to add course") }
  }

  function onEditCourse(id) {
    const c = courses.find((x) => x.id === id)
    if (!c) return
    setEditCourseForm({ id: c.id, name: c.name || '', subject: c.subject || '' })
    setEditCourseOpen(true)
  }

  async function onSaveCourseChanges() {
    if (!editCourseForm.id) return
    try {
      const payload = { name: editCourseForm.name, subject: editCourseForm.subject }
      const updated = await api.updateCourse(user.token, editCourseForm.id, payload, onLogout)
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c))
      appendLocalActivityLog({
        action: 'Course updated',
        type: 'task',
        details: `${updated?.name || editCourseForm.name || ''}`.trim() || 'Course updated'
      })
      setEditCourseOpen(false)
      toast.success('Course updated successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to update course')
    }
  }

  async function onDeleteCourse(id) {
    const accepted = await requestConfirm('Are you sure you want to delete this course?', {
      title: 'Delete Course',
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    })
    if (!accepted) return
    const c = courses.find((x) => x.id === id)
    await api.deleteCourse(user.token, id, onLogout)
    setCourses(prev => prev.filter(c => c.id !== id))
    appendLocalActivityLog({
      action: 'Course deleted',
      type: 'task',
      details: `${c?.name || ''}`.trim() || 'Course deleted'
    })
  }

  async function onDeleteUser(index) {
    const accepted = await requestConfirm('Are you sure you want to delete this user?', {
      title: 'Delete User',
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    })
    if (!accepted) return
    const u = users[index]
    if (u && u.id) {
      try {
        await api.deleteUser(user.token, u.id, onLogout)
        setUsers((prev) => prev.filter((_, i) => i !== index))
        appendLocalActivityLog({
          action: 'User deleted',
          type: 'user',
          details: `${u?.name || ''} (${u?.email || ''})`.trim() || 'User deleted'
        })
        toast.success("User deleted successfully")
      } catch (err) {
        console.error("Delete user error:", err)
        toast.error("Failed to delete user. There may be related records preventing deletion.")
      }
    }
  }

  function onEditUser(index) {
    const u = users[index]
    if (!u) return
    setEditIndex(index)

    const formState = {
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      dob: u.dob || '',
      role: mapBackendRole(u.role) || 'Student',
      status: mapBackendUserStatus(u.status) || 'Active',
      joiningDate: u.joiningDate || '',
      qualification: u.qualification || '',
      notes: u.notes || '',
      password: '',
      course: '',
    }

    if (u.role === 'Student' || u.role === 'ROLE_STUDENT') {
      const c = courses.find(course => course.students?.some(s => s.id === u.id))
      if (c) formState.course = c.id
    } else if (u.role === 'Teacher' || u.role === 'ROLE_TEACHER') {
      const c = courses.find(course => course.teacher?.id === u.id)
      if (c) formState.course = c.id
    }

    setEditForm(formState)
    setEditOpen(true)
  }

  async function onSaveUserChanges() {
    if (editIndex == null) return
    const existing = users[editIndex]
    if (!existing || !existing.id) {
      toast.error("User data is invalid. Please refresh the page.")
      return
    }

    const payload = {
      id: existing.id,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      dob: editForm.dob,
      role: toBackendRole(editForm.role),
      status: toBackendStatus(editForm.status),
      joiningDate: editForm.joiningDate,
      qualification: editForm.qualification,
      notes: editForm.notes,
    }

    if (editForm.password) {
      payload.password = editForm.password
    }

    try {
      if (existing.id) {
        await api.updateUser(user.token, existing.id, payload, onLogout)

        if (editForm.course) {
          const courseId = Number(editForm.course)
          const safeRole = String(payload.role).toUpperCase()
          if (safeRole === 'ROLE_TEACHER' || safeRole === 'TEACHER') {
            await api.assignTeacherToCourse(user.token, courseId, existing.id, onLogout)
          } else if (safeRole === 'ROLE_STUDENT' || safeRole === 'STUDENT') {
            await api.assignStudentToCourse(user.token, courseId, existing.id, onLogout)
          }
          // Refresh courses to show new counts
          const updatedCourses = await api.getCourses(user.token, onLogout)
          setCourses(updatedCourses)
        }
        
        // Refresh users to get latest course data
        const updatedUsers = await api.getUsers(user.token, onLogout)
        setUsers(updatedUsers)
        appendLocalActivityLog({
          action: 'User updated',
          type: 'user',
          details: `${editForm?.name || ''} (${editForm?.email || ''})`.trim() || 'User updated'
        })
        toast.success("User updated successfully")
      }
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Failed to save changes.");
    }
    setEditOpen(false)
  }

  function exportUsersCsv() {
    const rows = filteredUsers
    let csv = 'Name,Email,Role,Status,Phone,Date of Birth,Joining Date,Qualification\n'
    rows.forEach((u) => {
      csv += `"${u.name}","${u.email || ''}","${u.role}","${u.status}","${u.phone || ''}","${u.dob || ''}","${u.joiningDate || ''}","${u.qualification || ''}"\n`
    })
    downloadCsv(`users_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  function formatLogUser(userValue) {
    if (!userValue) return ''
    if (typeof userValue === 'string') return userValue
    if (typeof userValue === 'number') return String(userValue)
    return userValue.fullName || userValue.name || userValue.email || ''
  }

  function appendLocalActivityLog({ action, type, details }) {
    const adminRaw = user?.rawUser || user || {}
    const nextLog = normalizeActivityLogItem({
      timestamp: new Date().toISOString(),
      user: {
        id: adminRaw?.id ?? null,
        name: adminRaw?.name || adminRaw?.email || 'Admin',
        email: adminRaw?.email || '',
      },
      action,
      type,
      details,
    })

    setActivityLogs((prev) => mergeActivityLogs([nextLog], prev))
  }

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const ts = new Date(log.timestamp)
      const logDate = Number.isNaN(ts.getTime()) ? String(formatBackendDateTime(log.timestamp)).split(' ')[0] : ts.toISOString().slice(0, 10)
      const matchDate = !logDateFilter || logDate === logDateFilter
      const matchType = !logTypeFilter || String(log.type || '').toLowerCase() === logTypeFilter
      return matchDate && matchType
    })
  }, [activityLogs, logDateFilter, logTypeFilter])

  function exportActivityCsv() {
    let csv = 'Timestamp,User,Action,Type,Details\n'
    activityLogs.forEach((log) => {
      csv += `"${log.timestamp}","${formatLogUser(log.user)}","${log.action || ''}","${log.type || ''}","${log.details || ''}"\n`
    })
    downloadCsv(`activity_logs_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`.trim()} id="sidebar">
        <button className="sidebar-toggle" type="button" id="sidebarToggle" title="Toggle sidebar" onClick={() => setSidebarCollapsed((v) => !v)}>
          <i className="bi bi-chevron-left"></i>
        </button>
        <div className="sidebar-header">
          <span className="brand-icon">
            <i className="bi bi-check2-square"></i>
          </span>
          <div>
            <div className="brand-title">TaskFlow</div>
            <div className="brand-subtitle">Admin</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`.trim()} data-section="overview" onClick={() => setActiveSection('overview')}>
            <i className="bi bi-grid"></i>
            <span>Overview</span>
          </button>
          <button className={`nav-item ${activeSection === 'courses' ? 'active' : ''}`.trim()} data-section="courses" onClick={() => setActiveSection('courses')}>
            <i className="bi bi-book"></i>
            <span>Courses</span>
          </button>
          <button className={`nav-item ${activeSection === 'users' ? 'active' : ''}`.trim()} data-section="users" onClick={() => setActiveSection('users')}>
            <i className="bi bi-people"></i>
            <span>Users</span>
          </button>
          <button className={`nav-item ${activeSection === 'tasks' ? 'active' : ''}`.trim()} data-section="tasks" onClick={() => setActiveSection('tasks')}>
            <i className="bi bi-list-check"></i>
            <span>Tasks</span>
          </button>
          <button className={`nav-item ${activeSection === 'activity' ? 'active' : ''}`.trim()} data-section="activity" onClick={() => setActiveSection('activity')}>
            <i className="bi bi-clock-history"></i>
            <span>Activity</span>
          </button>
          <button className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`.trim()} data-section="settings" onClick={() => setActiveSection('settings')}>
            <i className="bi bi-gear"></i>
            <span>Settings</span>
          </button>
        </nav>

        <button className="nav-item logout-btn" type="button" onClick={onLogout}>
          <i className="bi bi-box-arrow-right"></i>
          <span>Log out</span>
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">Admin Dashboard</h1>
            <p className="topbar-subtitle">Monitor activity, manage users, and control settings.</p>
          </div>
          <div className="topbar-right">
            <ThemeToggle className="icon-btn" title="Toggle theme" />
            <div className="avatar-pill">
              <span className="avatar-circle">A</span>
              <span className="avatar-text">
                <span className="avatar-name">Admin</span>
                <span className="avatar-role">System Administrator</span>
              </span>
            </div>
          </div>
        </header>

        <section className={`section ${activeSection === 'overview' ? 'section-active' : ''}`.trim()} id="section-overview">
          <div className="row g-3 g-md-4 mb-4">
            <div className="col-md-4">
              <div className="stat-card accent-blue">
                <div className="stat-label">Active users</div>
                <AnimatedStatValue value={users.length} />
                <div className="stat-meta">
                  <span>
                    <i className="bi bi-arrow-up-right"></i> +12 this week
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-card accent-purple">
                <div className="stat-label">Open tasks</div>
                <AnimatedStatValue value={342} />
                <div className="stat-meta">
                  <span>
                    <i className="bi bi-activity"></i> 71 in review
                  </span>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="stat-card accent-green">
                <div className="stat-label">On‑time completion</div>
                <div className="stat-value">92%</div>
                <div className="stat-meta">
                  <span>
                    <i className="bi bi-check-circle"></i> SLA healthy
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 g-md-4">
            <div className="col-lg-7">
              <div className="panel">
                <div className="panel-header">
                  <h2>Recent activity</h2>
                  <span className="badge-pill">Live feed</span>
                </div>
                <ul className="activity-list" id="activityList">
                  {activityLogs.slice(0, 6).map((a, i) => (
                    <li key={i}>
                      <span>{a.action}</span>
                      <span>{a.timestamp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="col-lg-5">
              <div className="panel">
                <div className="panel-header">
                  <h2>System health</h2>
                </div>
                <ul className="health-list">
                  <li>
                    <span>API latency</span>
                    <span className="ok">Stable</span>
                  </li>
                  <li>
                    <span>Task queues</span>
                    <span className="ok">Normal</span>
                  </li>
                  <li>
                    <span>Email delivery</span>
                    <span className="warn">Minor delays</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className={`section ${activeSection === 'courses' ? 'section-active' : ''}`.trim()} id="section-courses">
          <div className="panel mb-3">
            <div className="panel-header">
              <h2>Courses</h2>
              <div className="header-actions">
                <button className="btn btn-sm btn-outline-light" onClick={() => setAddCourseVisible((v) => !v)}>
                  <i className="bi bi-plus-circle me-1"></i>Add course
                </button>
              </div>
            </div>

            <form className={`user-form row g-2 g-md-3 align-items-end mb-3 ${addCourseVisible ? 'visible' : ''}`.trim()} onSubmit={onAddCourseSubmit}>
              <div className="col-md-3">
                <label className="form-label small mb-1">Course Name</label>
                <input type="text" className="form-control form-control-sm" placeholder="e.g. Full Stack Development" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} />
              </div>
              <div className="col-md-5">
                <label className="form-label small mb-1">Classes (Comma separated)</label>
                <input type="text" className="form-control form-control-sm" placeholder="e.g. HTML, CSS, React" value={newCourseSubject} onChange={(e) => setNewCourseSubject(e.target.value)} />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-neon btn-sm w-100">Add Course</button>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-dark align-middle table-hover mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Classes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.subject}</td>
                      <td>
                        <button className="btn btn-sm btn-warning me-2 edit-btn" type="button" onClick={() => onEditCourse(c.id)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-danger delete-btn" type="button" onClick={() => onDeleteCourse(c.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`section ${activeSection === 'users' ? 'section-active' : ''}`.trim()} id="section-users">
          <div className="panel mb-3">
            <div className="panel-header">
              <h2>Users</h2>
              <div className="header-actions">
                <button className="btn btn-sm btn-outline-light" id="addUserBtn" type="button" onClick={() => setAddUserVisible((v) => !v)}>
                  <i className="bi bi-person-plus me-1"></i>Add user
                </button>
                <button className={`btn btn-sm btn-outline-danger ${checkedCount === 0 ? 'd-none' : ''}`.trim()} id="bulkDeleteBtn" type="button" onClick={onBulkDelete}>
                  <i className="bi bi-trash me-1"></i>Delete selected
                </button>
                <button className="btn btn-sm btn-outline-light" id="exportUsersBtn" type="button" onClick={exportUsersCsv}>
                  <i className="bi bi-download me-1"></i>Export
                </button>
              </div>
            </div>

            <div className="filter-bar mb-3">
              <input
                type="text"
                id="userSearch"
                className="form-control form-control-sm"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <select id="roleFilter" className="form-select form-select-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option>
                <option value="Admin">Admin</option>
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
              </select>
              <select id="statusFilter" className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="Online">Online</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <form id="addUserForm" className={`user-form row g-2 g-md-3 align-items-end mb-3 ${addUserVisible ? 'visible' : ''}`.trim()} onSubmit={onAddUserSubmit}>
              <div className="col-md-2">
                <label className="form-label small mb-1">Name</label>
                <input
                  type="text"
                  id="newUserName"
                  className="form-control form-control-sm"
                  placeholder="Full name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small mb-1">Email</label>
                <input
                  type="email"
                  id="newUserEmail"
                  className="form-control form-control-sm"
                  placeholder="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small mb-1">Password</label>
                <input
                  type="password"
                  id="newUserPassword"
                  className="form-control form-control-sm"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label small mb-1">Role</label>
                <select id="newUserRole" className="form-select form-select-sm" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                  <option value="Admin">Admin</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Student">Student</option>
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label small mb-1">Course</label>
                <select id="newUserCourse" className="form-select form-select-sm" value={newUserCourse} onChange={(e) => setNewUserCourse(e.target.value)}>
                  <option value="">None</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="col-md-2">
                <button type="submit" className="btn btn-neon btn-sm w-100">
                  Add User
                </button>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-dark align-middle table-hover mb-0">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        id="selectAllUsers"
                        className="form-check-input"
                        checked={selectAllState.total > 0 && selectAllState.checked === selectAllState.total}
                        ref={(el) => {
                          if (el) el.indeterminate = selectAllState.checked > 0 && selectAllState.checked < selectAllState.total
                        }}
                        onChange={(e) => onSelectAll(e.target.checked)}
                      />
                    </th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="usersTableBody">
                  {filteredUsers.map((u) => {
                    const idx = users.indexOf(u)
                    const checked = selectedUsers.has(idx)
                    return (
                      <tr key={idx} className="fade-in" data-index={idx}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input user-checkbox"
                            checked={checked}
                            onChange={(e) => toggleUserSelected(idx, e.target.checked)}
                          />
                        </td>
                        <td>{u.name}</td>
                        <td>{roleBadge(u.role)}</td>
                        <td>{mapBackendUserStatus(u.status)}</td>
                        <td>{u.last || 'N/A'}</td>
                        <td>
                          <button className="btn btn-sm btn-warning edit-btn" type="button" onClick={() => onEditUser(idx)}>
                            <i className="bi bi-pencil"></i>
                          </button>{' '}
                          <button className="btn btn-sm btn-danger delete-btn" type="button" onClick={() => onDeleteUser(idx)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={`section ${activeSection === 'tasks' ? 'section-active' : ''}`.trim()} id="section-tasks">
          <div className="panel">
            <div className="panel-header">
              <h2>Task queues</h2>
            </div>
            <div className="row g-3 g-md-4">
              <div className="col-md-4">
                <div className="queue-card">
                  <h3>Backlog</h3>
                  <p>Items waiting to be triaged.</p>
                  <span className="queue-count">{taskQueueCounts.backlog}</span>
                </div>
              </div>
              <div className="col-md-4">
                <div className="queue-card">
                  <h3>In progress</h3>
                  <p>Active work across all teams.</p>
                  <span className="queue-count">{taskQueueCounts.inProgress}</span>
                </div>
              </div>
              <div className="col-md-4">
                <div className="queue-card">
                  <h3>Blocked</h3>
                  <p>Tasks needing admin attention.</p>
                  <span className="queue-count critical">{taskQueueCounts.blocked}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`section ${activeSection === 'settings' ? 'section-active' : ''}`.trim()} id="section-settings">
          <div className="panel">
            <div className="panel-header">
              <h2>Workspace settings</h2>
            </div>
            <div className="settings-grid">
              <div>
                <label className="form-label text-secondary small">Notifications</label>
                <div className="form-switch">
                  <input className="form-check-input" type="checkbox" id="notifToggle" defaultChecked />
                  <label className="form-check-label" htmlFor="notifToggle">
                    Email alerts
                  </label>
                </div>
              </div>
              <div>
                <label className="form-label text-secondary small">Maintenance mode</label>
                <div className="form-switch">
                  <input className="form-check-input" type="checkbox" id="maintToggle" />
                  <label className="form-check-label" htmlFor="maintToggle">
                    Enable
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`section ${activeSection === 'activity' ? 'section-active' : ''}`.trim()} id="section-activity">
          <div className="panel">
            <div className="panel-header">
              <h2>Activity Logs</h2>
              <div className="header-actions">
                <input type="date" id="logDateFilter" className="form-control form-control-sm" style={{ width: 150 }} value={logDateFilter} onChange={(e) => setLogDateFilter(e.target.value)} />
                <select id="logTypeFilter" className="form-select form-select-sm" style={{ width: 150 }} value={logTypeFilter} onChange={(e) => setLogTypeFilter(e.target.value)}>
                  <option value="">All activities</option>
                  <option value="user">User operations</option>
                  <option value="task">Task operations</option>
                  <option value="system">System events</option>
                  <option value="login">Login/Logout</option>
                </select>
                <button className="btn btn-sm btn-outline-light" id="exportActivityBtn" type="button" onClick={exportActivityCsv}>
                  <i className="bi bi-download me-1"></i>Export
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-dark align-middle table-hover mb-0">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Type</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody id="activityLogsBody">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-4">
                        No activity logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, i) => (
                      <tr key={i}>
                        <td>{log.timestamp}</td>
                        <td>{formatLogUser(log.user)}</td>
                        <td>{log.action}</td>
                        <td>
                          <span className="badge bg-secondary">{log.type}</span>
                        </td>
                        <td>{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Edit Course Modal */}
      <SimpleModal open={editCourseOpen} onClose={() => setEditCourseOpen(false)} labelledBy="editCourseModalLabel">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editCourseModalLabel">Edit Course</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditCourseOpen(false)}></button>
            </div>
            <div className="modal-body">
              <form onSubmit={e => e.preventDefault()}>
                <div className="mb-3">
                  <label className="form-label">Course Name</label>
                  <input type="text" className="form-control" required value={editCourseForm.name} onChange={(e) => setEditCourseForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Classes (Comma separated)</label>
                  <input type="text" className="form-control" value={editCourseForm.subject} onChange={(e) => setEditCourseForm((p) => ({ ...p, subject: e.target.value }))} />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditCourseOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={onSaveCourseChanges}>Save Changes</button>
            </div>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal open={editOpen} onClose={() => setEditOpen(false)} labelledBy="editUserModalLabel" className="">
        <div className="modal-dialog modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editUserModalLabel">
                Edit User Profile
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditOpen(false)}></button>
            </div>
            <div className="modal-body">
              <form id="editUserFormModal" onSubmit={(e) => e.preventDefault()}>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" id="editName" required value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" id="editEmail" required value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" className="form-control" id="editPhone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" id="editDob" value={editForm.dob} onChange={(e) => setEditForm((p) => ({ ...p, dob: e.target.value }))} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Role</label>
                    <select className="form-select" id="editRole" required value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}>
                      <option value="Admin">Admin</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Student">Student</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Course</label>
                    <select className="form-select" id="editCourse" value={editForm.course} onChange={(e) => setEditForm((p) => ({ ...p, course: e.target.value }))}>
                      <option value="">None</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" id="editStatus" required value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                      <option value="Online">Online</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Password (leave blank to keep current)</label>
                    <input type="password" name="password" className="form-control" id="editPassword" value={editForm.password || ''} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} placeholder="Enter new password" />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Joining Date</label>
                    <input type="date" className="form-control" id="editJoiningDate" value={editForm.joiningDate} onChange={(e) => setEditForm((p) => ({ ...p, joiningDate: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Qualification</label>
                    <input type="text" className="form-control" id="editQualification" placeholder="e.g., B.Tech, MBA, etc." value={editForm.qualification} onChange={(e) => setEditForm((p) => ({ ...p, qualification: e.target.value }))} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Additional Notes</label>
                  <textarea className="form-control" id="editNotes" rows={3} placeholder="Any additional information..." value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}></textarea>
                </div>

                <input type="hidden" id="editUserIndex" value={editIndex ?? ''} readOnly />
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" id="saveUserChanges" onClick={onSaveUserChanges}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </SimpleModal>
      {confirmModal}
    </div>
  )
}

function TeacherDashboard({ onLogout }) {
  const { user } = useContext(AuthContext)
  const { requestConfirm, modal: confirmModal } = useConfirmDialog()
  const teacherId = safeNumber(user?.rawUser?.id || user?.id)



  useEffect(() => {
    import('../css/teacher-dashboard.css')
  }, [])

  useEffect(() => {
    document.title = 'Teacher Dashboard – Task Management System'
  }, [])

  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState('sidebarCollapsed', false)
  const [activeSection, setActiveSection] = useState('overview')

  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [tests, setTests] = useState([])
  const [teacherSubmissions, setTeacherSubmissions] = useState([])
  const [attendance, setAttendance] = useState([])
  const [grades, setGrades] = useState([])
  const [allStudentAssignments, setAllStudentAssignments] = useState([])

  const loadTeacherData = useCallback(async () => {
    if (!teacherId || !user?.token) return

    try {
      const [c, a, t, att, s] = await Promise.all([
        api.getCoursesByTeacher(user.token, teacherId, onLogout),
        api.getAssignmentsByTeacher(user.token, teacherId, onLogout),
        api.getExamsByTeacher(user.token, teacherId, onLogout),
        api.getAttendanceByTeacher(user.token, teacherId, onLogout),
        api.getSubmissionsByTeacher(user.token, teacherId, onLogout)
      ])
      setClasses(c || [])
      setAssignments(a || [])
      setTests(t || [])
      setAttendance(att || [])
      setTeacherSubmissions(s || [])

      if (c && c.length > 0) {
        const assignmentsList = []
        for (const course of c) {
          try {
            const courseAsgns = await api.getStudentClasses(user.token, course.id, onLogout)
            if (Array.isArray(courseAsgns)) assignmentsList.push(...courseAsgns)
          } catch (err) {
            console.error(`Failed to fetch assignments for course ${course.id}:`, err)
          }
        }
        setAllStudentAssignments(assignmentsList)
      }
    } catch (error) {
      console.error("Failed to fetch teacher data:", error)
    }
  }, [teacherId, user?.token, onLogout])

  useEffect(() => {
    loadTeacherData()
  }, [loadTeacherData])



  const [createAssignmentVisible, setCreateAssignmentVisible] = useState(false)
  const [createTestVisible, setCreateTestVisible] = useState(false)

  const [manageClassesOpen, setManageClassesOpen] = useState(false)
  const [selectedStudentForClass, setSelectedStudentForClass] = useState(null)
  const [selectedCourseForClass, setSelectedCourseForClass] = useState(null)
  const [studentAssignedClasses, setStudentAssignedClasses] = useState([]) // Array of { className, schedule }

  async function openManageClasses(student, course) {
    setSelectedStudentForClass(student)
    setSelectedCourseForClass(course)
    setManageClassesOpen(true)
    try {
      const data = await api.getStudentClasses(user.token, course.id, onLogout)
      const assigned = data.filter(d => String(d.student?.id) === String(student.id))
        .map(d => ({ className: d.className, schedule: d.schedule || '' }))
      setStudentAssignedClasses(assigned)
    } catch (err) {
      toast.error('Failed to load assigned classes')
    }
  }

  async function saveStudentClasses() {
    if (!selectedStudentForClass || !selectedCourseForClass) return
    try {
      await api.assignStudentClasses(user.token, {
        courseId: selectedCourseForClass.id,
        studentId: selectedStudentForClass.id,
        assignments: studentAssignedClasses
      }, onLogout)
      toast.success('Classes assigned successfully')
      appendActivityLog({
        action: 'Class schedule updated',
        type: 'task',
        details: `${selectedStudentForClass?.name || 'Student'} in ${selectedCourseForClass?.name || 'course'}`,
        user: {
          id: user?.rawUser?.id ?? null,
          name: user?.rawUser?.name || user?.email || 'Teacher',
          email: user?.rawUser?.email || user?.email || '',
          role: 'TEACHER',
        },
      })
      setManageClassesOpen(false)
      
      // Refresh all student assignments for this course to ensure data consistency
      const data = await api.getStudentClasses(user.token, selectedCourseForClass.id, onLogout)
      
      // Update allStudentAssignments by replacing existing assignments for this course
      setAllStudentAssignments(prev => {
        const filtered = prev.filter(a => String(a.course?.id || a.courseId) !== String(selectedCourseForClass.id))
        return [...filtered, ...data]
      })
      
      // Also trigger a general refresh if this is the current user's own assignments
      if (String(selectedStudentForClass.id) === String(teacherId)) {
        // Refresh the teacher's own data to see their assigned classes
        loadTeacherData()
      }
    } catch (err) {
      toast.error('Failed to schedule classes')
    }
  }

  const [newAssignment, setNewAssignment] = useState({ title: '', classId: '', dueDate: '' })
  const [newTest, setNewTest] = useState({ title: '', classId: '', testDate: '', duration: '', totalMarks: '' })

  const [assignmentFilters, setAssignmentFilters] = useState({ search: '', classId: '', status: '' })
  const [testFilters, setTestFilters] = useState({ search: '', classId: '', status: '' })
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [attendanceFilters, setAttendanceFilters] = useState({ classId: '', date: todayIso })

  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState(null)

  const [editTestOpen, setEditTestOpen] = useState(false)
  const [editTest, setEditTest] = useState(null)

  const [gradingOpen, setGradingOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [gradingForm, setGradingForm] = useState({ grade: '', status: 'Graded' })

  const [attendanceDrafts, setAttendanceDrafts] = useState({})

  const overviewDeadlines = useMemo(() => {
    const activeAssignments = assignments.filter((a) => a.status !== 'Completed').slice()
    activeAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    return activeAssignments.slice(0, 5)
  }, [assignments])

  const filteredAssignments = useMemo(() => {
    const search = assignmentFilters.search.trim().toLowerCase()
    return assignments.filter((a) => {
      const matchSearch = !search || a.title.toLowerCase().includes(search)
      const assignmentCourseId = a.course?.id || a.courseId || a.classId
      const matchClass = !assignmentFilters.classId || String(assignmentCourseId) === String(assignmentFilters.classId)
      const matchStatus = !assignmentFilters.status || mapBackendTaskStatus(a.status) === assignmentFilters.status
      return matchSearch && matchClass && matchStatus
    })
  }, [assignments, assignmentFilters])

  const normalizedTests = useMemo(() => {
    const today = new Date()
    return tests.map((t) => {
      const testDateObj = new Date(t.testDate)
      let status = t.status
      if (t.status !== 'Completed') {
        if (testDateObj.toDateString() === today.toDateString()) status = 'Active'
        else if (testDateObj < today) status = 'Completed'
        else status = 'Scheduled'
      }
      return { ...t, status }
    })
  }, [tests])

  const filteredTests = useMemo(() => {
    const search = testFilters.search.trim().toLowerCase()
    return normalizedTests.filter((t) => {
      const matchSearch = !search || t.title.toLowerCase().includes(search)
      const testCourseId = t.course?.id || t.courseId || t.classId
      const matchClass = !testFilters.classId || String(testCourseId) === String(testFilters.classId)
      const matchStatus = !testFilters.status || mapBackendExamStatus(t.status) === testFilters.status
      return matchSearch && matchClass && matchStatus
    })
  }, [normalizedTests, testFilters])

  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => {
      const matchClass = !attendanceFilters.classId || String(a.course?.id || a.courseId || a.classId) === String(attendanceFilters.classId)
      const matchDate = !attendanceFilters.date || a.date === attendanceFilters.date
      return matchClass && matchDate
    })
  }, [attendance, attendanceFilters])

  const selectedAttendanceClass = useMemo(
    () => classes.find((c) => String(c.id) === String(attendanceFilters.classId)) || null,
    [classes, attendanceFilters.classId]
  )

  const attendanceStudents = useMemo(
    () => selectedAttendanceClass?.students || [],
    [selectedAttendanceClass]
  )

  const attendanceByStudentId = useMemo(() => {
    const map = new Map()
    filteredAttendance.forEach((a) => {
      const sid = String(a.student?.id || a.studentId || '')
      if (sid) map.set(sid, a)
    })
    return map
  }, [filteredAttendance])

  useEffect(() => {
    if (!attendanceFilters.classId && classes.length > 0) {
      setAttendanceFilters((prev) => ({ ...prev, classId: String(classes[0].id) }))
    }
  }, [classes, attendanceFilters.classId])

  useEffect(() => {
    const nextDrafts = {}
    attendanceStudents.forEach((student) => {
      const sid = String(student.id)
      const existing = attendanceByStudentId.get(sid)
      nextDrafts[sid] = {
        attendanceId: existing?.id ?? null,
        status: mapBackendAttendanceStatus(existing?.status) || 'Present',
        notes: existing?.notes || '',
      }
    })
    setAttendanceDrafts(nextDrafts)
  }, [attendanceStudents, attendanceByStudentId, attendanceFilters.date, attendanceFilters.classId])

  function nextId(list) {
    return Math.max(0, ...list.map((x) => x.id || 0)) + 1
  }

  async function onCreateAssignmentSubmit(e) {
    e.preventDefault()
    const title = newAssignment.title.trim()
    const classId = Number(newAssignment.classId)
    const dueDate = newAssignment.dueDate
    if (!title || !classId || !dueDate) return

    try {
      const created = await api.createAssignment(user.token, { title, course: { id: classId }, dueDate, status: 'Active' }, onLogout)
      setAssignments((prev) => [...prev, created])
      appendActivityLog({
        action: 'Assignment posted',
        type: 'task',
        details: `${created?.title || title} (due ${dueDate})`,
        user: {
          id: user?.rawUser?.id ?? null,
          name: user?.rawUser?.name || user?.email || 'Teacher',
          email: user?.rawUser?.email || user?.email || '',
          role: 'TEACHER',
        },
      })
      setNewAssignment({ title: '', classId: '', dueDate: '' })
      setCreateAssignmentVisible(false)
    } catch (error) {
      toast.error('Error creating assignment')
    }
  }

  function openEditAssignment(id) {
    const a = assignments.find((x) => x.id === id)
    if (!a) return
    setEditAssignment({ 
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate,
      status: a.status,
      classId: a.course?.id || a.courseId || a.classId
    })
    setEditAssignmentOpen(true)
  }

  async function saveAssignmentChanges() {
    if (!editAssignment || !editAssignment.id) return
    try {
      const payload = {
        id: editAssignment.id,
        title: editAssignment.title,
        description: editAssignment.description,
        dueDate: editAssignment.dueDate,
        status: editAssignment.status,
        course: { id: Number(editAssignment.classId) }
      }
      const updated = await api.updateAssignment(user.token, editAssignment.id, payload, onLogout)
      setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setEditAssignmentOpen(false)
    } catch (error) {
      toast.error('Error updating assignment')
    }
  }

  async function deleteAssignmentFromModal() {
    if (!editAssignment) return
    const accepted = await requestConfirm('Are you sure you want to delete this assignment?', {
      title: 'Delete Assignment',
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    })
    if (!accepted) return
    try {
      await api.deleteAssignment(user.token, editAssignment.id, onLogout)
      setAssignments((prev) => prev.filter((a) => a.id !== editAssignment.id))
      setEditAssignmentOpen(false)
    } catch (error) {
      toast.error('Error deleting assignment')
    }
  }

  function exportAssignmentsCsv() {
    let csv = 'Title,Class,Due Date,Status,Submissions\n'
    filteredAssignments.forEach((a) => {
      const classId = a.course?.id || a.classId
      const classObj = classes.find((c) => c.id === classId)
      csv += `"${a.title}","${classObj?.name || 'N/A'}","${a.dueDate}","${a.status}","${a.submissions?.length || 0}"\n`
    })
    downloadCsv(`assignments_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  async function onCreateTestSubmit(e) {
    e.preventDefault()
    const title = newTest.title.trim()
    const classId = Number(newTest.classId)
    const testDate = newTest.testDate
    const duration = Number(newTest.duration)
    const totalMarks = Number(newTest.totalMarks)
    if (!title || !classId || !testDate || !duration || !totalMarks) return

    try {
      const created = await api.createExam(user.token, { title, course: { id: classId }, testDate, duration, totalMarks, status: 'Scheduled' }, onLogout)
      setTests((prev) => [...prev, created])
      setNewTest({ title: '', classId: '', testDate: '', duration: '', totalMarks: '' })
      setCreateTestVisible(false)
    } catch (error) {
      toast.error('Error creating exam')
    }
  }

  function openEditTest(id) {
    const t = tests.find((x) => x.id === id)
    if (!t) return
    setEditTest({
      id: t.id,
      title: t.title,
      description: t.description,
      testDate: t.testDate,
      duration: t.duration,
      totalMarks: t.totalMarks,
      status: t.status,
      classId: t.course?.id || t.courseId || t.classId
    })
    setEditTestOpen(true)
  }

  async function saveTestChanges() {
    if (!editTest || !editTest.id) return
    try {
      const payload = {
        id: editTest.id,
        title: editTest.title,
        description: editTest.description,
        testDate: editTest.testDate,
        duration: editTest.duration,
        totalMarks: editTest.totalMarks,
        status: editTest.status,
        course: { id: Number(editTest.classId) }
      }
      const updated = await api.updateExam(user.token, editTest.id, payload, onLogout)
      setTests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditTestOpen(false)
    } catch (error) {
      toast.error('Error updating exam')
    }
  }

  async function deleteTestFromModal() {
    if (!editTest) return
    const accepted = await requestConfirm('Are you sure you want to delete this test?', {
      title: 'Delete Test',
      confirmLabel: 'Delete',
      confirmClass: 'btn-danger',
    })
    if (!accepted) return
    try {
      await api.deleteExam(user.token, editTest.id, onLogout)
      setTests((prev) => prev.filter((t) => t.id !== editTest.id))
      setEditTestOpen(false)
    } catch (error) {
      toast.error('Error deleting exam')
    }
  }

  function openGradingModal(submission) {
    setSelectedSubmission(submission)
    setGradingForm({
      grade: submission.grade !== null && submission.grade !== undefined ? submission.grade : '',
      status: submission.status === 'Submitted' ? 'Graded' : submission.status
    })
    setGradingOpen(true)
  }

  async function saveGrade() {
    if (!selectedSubmission || !selectedSubmission.id) return
    const gradeValue = Number(gradingForm.grade)
    if (!Number.isFinite(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      toast.error('Please enter a valid grade between 0 and 100')
      return
    }
    try {
      const payload = {
        id: selectedSubmission.id,
        grade: gradeValue,
        status: gradingForm.status
      }
      const updated = await api.updateSubmission(user.token, selectedSubmission.id, payload, onLogout)

      setTeacherSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s))
      setGradingOpen(false)
    } catch (e) {
      toast.error('Error updating grade')
    }
  }

  function updateAttendanceDraft(studentId, patch) {
    const key = String(studentId)
    setAttendanceDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { attendanceId: null, status: 'Present', notes: '' }), ...patch },
    }))
  }

  function markAllPresent() {
    const next = {}
    attendanceStudents.forEach((student) => {
      const sid = String(student.id)
      next[sid] = {
        attendanceId: attendanceDrafts[sid]?.attendanceId ?? null,
        status: 'Present',
        notes: attendanceDrafts[sid]?.notes || '',
      }
    })
    setAttendanceDrafts(next)
  }

  async function saveAttendanceForStudent(student, { silent = false } = {}) {
    const sid = String(student.id)
    const draft = attendanceDrafts[sid] || { attendanceId: null, status: 'Present', notes: '' }
    if (!attendanceFilters.classId || !attendanceFilters.date) {
      toast.error('Please select class and date first')
      return
    }

    const payload = {
      student: { id: Number(student.id) },
      course: { id: Number(attendanceFilters.classId) },
      date: attendanceFilters.date,
      status: draft.status,
      notes: draft.notes || '',
    }

    try {
      if (draft.attendanceId) {
        const updated = await api.updateAttendance(user.token, draft.attendanceId, { id: draft.attendanceId, ...payload }, onLogout)
        setAttendance((prev) => prev.map((a) => (a.id === draft.attendanceId ? updated : a)))
        if (!silent) toast.success(`Updated attendance for ${student.fullName || student.name}`)
      } else {
        const created = await api.createAttendance(user.token, payload, onLogout)
        setAttendance((prev) => [...prev, created])
        setAttendanceDrafts((prev) => ({
          ...prev,
          [sid]: { ...(prev[sid] || {}), attendanceId: created?.id ?? null },
        }))
        if (!silent) toast.success(`Marked attendance for ${student.fullName || student.name}`)
      }
      return true
    } catch (error) {
      if (!silent) toast.error('Error saving attendance')
      return false
    }
  }

  async function saveAllAttendance() {
    if (!attendanceFilters.classId || !attendanceFilters.date) {
      toast.error('Please select class and date first')
      return
    }
    if (attendanceStudents.length === 0) {
      toast.info('No students found to save attendance')
      return
    }

    const results = await Promise.all(attendanceStudents.map((student) => saveAttendanceForStudent(student, { silent: true })))
    const successCount = results.filter(Boolean).length
    const failedCount = results.length - successCount

    if (successCount > 0) toast.success(`Saved attendance for ${successCount} student${successCount === 1 ? '' : 's'}`)
    if (failedCount > 0) toast.error(`Failed to save ${failedCount} student${failedCount === 1 ? '' : 's'}`)
  }

  function exportTestsCsv() {
    let csv = 'Title,Class,Test Date,Duration (min),Total Marks,Status\n'
    filteredTests.forEach((t) => {
      const classObj = classes.find((c) => c.id === t.classId)
      csv += `"${t.title}","${classObj?.name || 'N/A'}","${t.testDate}",${t.duration},${t.totalMarks},"${t.status}"\n`
    })
    downloadCsv(`tests_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  function exportGradesCsv() {
    let csv = 'Student Name,Assignment 1,Assignment 2,Assignment 3,Average\n'
    grades.forEach((g) => {
      const avg = Math.round((g.assignment1 + g.assignment2 + g.assignment3) / 3)
      csv += `"${g.name}",${g.assignment1},${g.assignment2},${g.assignment3},${avg}\n`
    })
    downloadCsv(`grades_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  function exportAttendanceCsv() {
    let csv = 'Student Name,Status,Date,Notes\n'
    attendance.forEach((a) => {
      csv += `"${a.name}","${a.status}","${a.date}","${a.notes}"\n`
    })
    downloadCsv(`attendance_${new Date().toISOString().split('T')[0]}.csv`, csv)
  }

  return (
    <>
      {/* preserved inline style from original HTML */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(15,23,42,0.95) inset !important;
          -webkit-text-fill-color: var(--text-main, #e5e7eb) !important;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: var(--text-main, #e5e7eb);
        }
        html[data-theme="light"] input:-webkit-autofill,
        html[data-theme="light"] input:-webkit-autofill:hover, 
        html[data-theme="light"] input:-webkit-autofill:focus, 
        html[data-theme="light"] input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(241,245,249,0.95) inset !important;
          -webkit-text-fill-color: var(--text-main, #1e293b) !important;
          caret-color: var(--text-main, #1e293b);
        }
      `}</style>

      <div className="layout">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`.trim()} id="sidebar">
          <button className="sidebar-toggle" type="button" id="sidebarToggle" title="Toggle sidebar" onClick={() => setSidebarCollapsed((v) => !v)}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <div className="sidebar-header">
            <span className="brand-icon">
              <i className="bi bi-mortarboard"></i>
            </span>
            <div>
              <div className="brand-title">TaskFlow</div>
              <div className="brand-subtitle">Teacher</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {[
              ['overview', 'bi bi-graph-up', 'Overview'],
              ['assignments', 'bi bi-file-earmark-text', 'Assignments'],
              ['tests', 'bi bi-clipboard-check', 'Tests'],
              ['classes', 'bi bi-people', 'Classes'],
              ['students', 'bi bi-person-badge', 'Students'],
              ['submissions', 'bi bi-file-earmark-check', 'Submissions'],
              ['attendance', 'bi bi-calendar-check', 'Attendance'],
              ['progress', 'bi bi-bar-chart', 'Progress'],
            ].map(([key, icon, label]) => (
              <button key={key} className={`nav-item ${activeSection === key ? 'active' : ''}`.trim()} data-section={key} onClick={() => setActiveSection(key)}>
                <i className={icon}></i>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button className="nav-item logout-btn" type="button" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Log out</span>
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1 className="topbar-title">Teacher Dashboard</h1>
              <p className="topbar-subtitle">Manage classes, assignments, and student progress.</p>
            </div>
            <div className="topbar-right">
              <ThemeToggle className="icon-btn" title="Toggle theme" />
              <div className="avatar-pill">
                <span className="avatar-circle">T</span>
                <span className="avatar-text">
                  <span className="avatar-name">Teacher</span>
                  <span className="avatar-role">Educator</span>
                </span>
              </div>
            </div>
          </header>

          <section className={`section ${activeSection === 'overview' ? 'section-active' : ''}`.trim()} id="section-overview">
            <div className="row g-3 g-md-4 mb-4">
              <div className="col-md-4">
                <div className="stat-card accent-blue">
                  <div className="stat-label">Active Classes</div>
                  <div className="stat-value">{classes.length}</div>
                  <div className="stat-meta">
                    <span>
                      <i className="bi bi-people"></i> {classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)} students
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="stat-card accent-purple">
                  <div className="stat-label">Pending Assignments</div>
                  <div className="stat-value">{assignments.filter((a) => a.status !== 'Completed').length}</div>
                  <div className="stat-meta">
                    <span>
                      <i className="bi bi-exclamation-circle"></i> 8 due soon
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="stat-card accent-green">
                  <div className="stat-label">Avg. Class Grade</div>
                  <div className="stat-value">82%</div>
                  <div className="stat-meta">
                    <span>
                      <i className="bi bi-check-circle"></i> Good performance
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3 g-md-4">
              <div className="col-lg-7">
                <div className="panel">
                  <div className="panel-header">
                    <h2>Upcoming Deadlines</h2>
                  </div>
                  <ul className="deadline-list" id="deadlineList">
                    {overviewDeadlines.map((a) => {
                      const daysLeft = Math.ceil((new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
                      const timeLabel = daysLeft > 0 ? `${daysLeft} days` : daysLeft === 0 ? 'Due Today' : 'Overdue'
                      return (
                        <li key={a.id}>
                          <strong>{a.title}</strong>
                          <span className={daysLeft < 0 ? 'text-danger' : ''}>{timeLabel}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
              <div className="col-lg-5">
                <div className="panel">
                  <div className="panel-header">
                    <h2>Class Overview</h2>
                  </div>
                  <ul className="class-summary" id="classSummary">
                    {classes.map((c) => (
                      <li key={c.id}>
                        <span>{c.name}</span>
                        <span className="badge bg-info text-dark">{c.students?.length || 0} students</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'assignments' ? 'section-active' : ''}`.trim()} id="section-assignments">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Assignments</h2>
                <div className="header-actions">
                  <button className="btn btn-sm btn-outline-light" id="createAssignmentBtn" type="button" onClick={() => setCreateAssignmentVisible((v) => !v)}>
                    <i className="bi bi-plus-circle me-1"></i>Create assignment
                  </button>
                  <button className="btn btn-sm btn-outline-light" id="exportAssignmentsBtn" type="button" onClick={exportAssignmentsCsv}>
                    <i className="bi bi-download me-1"></i>Export
                  </button>
                </div>
              </div>

              <div className="filter-bar mb-3">
                <input type="text" id="assignmentSearch" className="form-control form-control-sm" placeholder="Search assignments..." value={assignmentFilters.search} onChange={(e) => setAssignmentFilters((p) => ({ ...p, search: e.target.value }))} />
                <select id="assignmentClassFilter" className="form-select form-select-sm" value={assignmentFilters.classId} onChange={(e) => setAssignmentFilters((p) => ({ ...p, classId: e.target.value }))}>
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select id="assignmentStatusFilter" className="form-select form-select-sm" value={assignmentFilters.status} onChange={(e) => setAssignmentFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </div>

              <form id="createAssignmentForm" className={`form-row g-2 g-md-3 align-items-end mb-3 ${createAssignmentVisible ? 'visible' : ''}`.trim()} onSubmit={onCreateAssignmentSubmit}>
                <div className="col-md-4">
                  <label className="form-label small mb-1">Assignment Title</label>
                  <input type="text" id="newAssignmentTitle" className="form-control form-control-sm" placeholder="e.g., Chapter 5 Exercises" value={newAssignment.title} onChange={(e) => setNewAssignment((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small mb-1">Class</label>
                  <select id="newAssignmentClass" className="form-select form-select-sm" value={newAssignment.classId} onChange={(e) => setNewAssignment((p) => ({ ...p, classId: e.target.value }))}>
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small mb-1">Due Date</label>
                  <input type="date" id="newAssignmentDue" className="form-control form-control-sm" value={newAssignment.dueDate} onChange={(e) => setNewAssignment((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-neon btn-sm w-100">
                    Add
                  </button>
                </div>
              </form>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Class</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Submissions</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="assignmentsTableBody">
                    {filteredAssignments.map((a) => {
                      const classObj = classes.find((c) => c.id === (a.course?.id || a.classId))
                      const statusBadge = a.status === 'Active' ? 'success' : a.status === 'Completed' ? 'secondary' : 'warning'
                      return (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td>{classObj?.name || 'N/A'}</td>
                          <td>{a.dueDate}</td>
                          <td>
                            <span className={`badge bg-${statusBadge}`}>{a.status}</span>
                          </td>
                          <td>
                            {a.submissions?.length || 0}/{classObj?.students?.length || 0}
                          </td>
                          <td>
                            <button className="btn btn-sm btn-warning" type="button" onClick={() => openEditAssignment(a.id)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'tests' ? 'section-active' : ''}`.trim()} id="section-tests">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Tests & Assessments</h2>
                <div className="header-actions">
                  <button className="btn btn-sm btn-outline-light" id="createTestBtn" type="button" onClick={() => setCreateTestVisible((v) => !v)}>
                    <i className="bi bi-plus-circle me-1"></i>Create test
                  </button>
                  <button className="btn btn-sm btn-outline-light" id="exportTestsBtn" type="button" onClick={exportTestsCsv}>
                    <i className="bi bi-download me-1"></i>Export
                  </button>
                </div>
              </div>

              <div className="filter-bar mb-3">
                <input type="text" id="testSearch" className="form-control form-control-sm" placeholder="Search tests..." value={testFilters.search} onChange={(e) => setTestFilters((p) => ({ ...p, search: e.target.value }))} />
                <select id="testClassFilter" className="form-select form-select-sm" value={testFilters.classId} onChange={(e) => setTestFilters((p) => ({ ...p, classId: e.target.value }))}>
                  <option value="">All classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select id="testStatusFilter" className="form-select form-select-sm" value={testFilters.status} onChange={(e) => setTestFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <form id="createTestForm" className={`form-row g-2 g-md-3 align-items-end mb-3 ${createTestVisible ? '' : 'd-none'}`.trim()} onSubmit={onCreateTestSubmit}>
                <div className="col-md-3">
                  <label className="form-label small mb-1">Test Title</label>
                  <input type="text" id="newTestTitle" className="form-control form-control-sm" placeholder="e.g., Midterm Exam" value={newTest.title} onChange={(e) => setNewTest((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-1">Class</label>
                  <select id="newTestClass" className="form-select form-select-sm" value={newTest.classId} onChange={(e) => setNewTest((p) => ({ ...p, classId: e.target.value }))}>
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-1">Test Date</label>
                  <input type="date" id="newTestDate" className="form-control form-control-sm" value={newTest.testDate} onChange={(e) => setNewTest((p) => ({ ...p, testDate: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-1">Duration (mins)</label>
                  <input type="number" id="newTestDuration" className="form-control form-control-sm" placeholder="60" value={newTest.duration} onChange={(e) => setNewTest((p) => ({ ...p, duration: e.target.value }))} />
                </div>
                <div className="col-md-3">
                  <label className="form-label small mb-1">Total Marks</label>
                  <input type="number" id="newTestMarks" className="form-control form-control-sm" placeholder="100" value={newTest.totalMarks} onChange={(e) => setNewTest((p) => ({ ...p, totalMarks: e.target.value }))} />
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-neon btn-sm w-100">
                    Add
                  </button>
                </div>
              </form>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Test Title</th>
                      <th>Class</th>
                      <th>Test Date</th>
                      <th>Duration</th>
                      <th>Total Marks</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="testsTableBody">
                    {filteredTests.map((t) => {
                      const classObj = classes.find((c) => c.id === (t.course?.id || t.classId))
                      const statusBadge = t.status === 'Scheduled' ? 'info' : t.status === 'Active' ? 'success' : 'secondary'
                      return (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td>{classObj?.name || 'N/A'}</td>
                          <td>{t.testDate}</td>
                          <td>{t.duration} min</td>
                          <td>{t.totalMarks}</td>
                          <td>
                            <span className={`badge bg-${statusBadge}`}>{t.status}</span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-warning" type="button" onClick={() => openEditTest(t.id)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'classes' ? 'section-active' : ''}`.trim()} id="section-classes">
            <div className="panel mb-3">
              <div className="panel-header d-flex justify-content-between align-items-center">
                <h2>Classes & Groups</h2>
                <button className="btn btn-sm btn-outline-info" onClick={loadTeacherData} title="Refresh classes">
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Admins create courses. Teachers can schedule specific classes for individual students in the <strong>Students</strong> section.
              </div>

              <div className="row g-3 g-md-4" id="classesGrid">
                {classes.map((c) => {
                  const courseAssignments = allStudentAssignments.filter(a => String(a.course?.id || a.courseId) === String(c.id))
                  return (
                    <div className="col-12" key={c.id}>
                      <div className="panel border border-secondary mb-4 overflow-hidden">
                        <div className="panel-header bg-dark p-3 d-flex justify-content-between align-items-center">
                          <div>
                            <h3 className="m-0 text-neon">{c.name}</h3>
                            <span className="text-secondary small">Course ID: {c.id}</span>
                          </div>
                          <div className="text-end">
                            <div className="subjects-badges d-flex flex-wrap gap-1 justify-content-end">
                              {c.subject?.split(',').map((s, idx) => (
                                <span key={idx} className="badge bg-secondary opacity-75">{s.trim()}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="panel-body p-0">
                          <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle mb-0">
                              <thead className="bg-black text-neon small uppercase ls-1">
                                <tr>
                                  <th className="ps-4">Student</th>
                                  <th>Assigned Subject / Class</th>
                                  <th>Schedule / Timing</th>
                                </tr>
                              </thead>
                              <tbody>
                                {courseAssignments.length > 0 ? (
                                  courseAssignments.map((asgn, idx) => (
                                    <tr key={idx} className="border-bottom border-secondary border-opacity-25">
                                      <td className="ps-4 py-3">
                                        <div className="d-flex align-items-center">
                                          <div className="avatar-sm me-3 bg-neon-purple rounded-circle d-flex align-items-center justify-content-center text-white small">
                                            {(asgn.student?.fullName || asgn.student?.name || '?').charAt(0)}
                                          </div>
                                          <span className="fw-bold">{asgn.student?.fullName || asgn.student?.name}</span>
                                        </div>
                                      </td>
                                      <td>
                                        <span className="badge bg-neon-blue text-dark fw-bold">{asgn.className}</span>
                                      </td>
                                      <td>
                                        <div className="d-flex align-items-center text-info">
                                          <i className="bi bi-clock me-2"></i>
                                          <span>{asgn.schedule || 'Schedule pending'}</span>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="3" className="text-center text-muted py-5">
                                      <i className="bi bi-calendar-x d-block fs-2 mb-2 opacity-50"></i>
                                      No individual classes scheduled yet for this course.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'students' ? 'section-active' : ''}`.trim()} id="section-students">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>My Students</h2>
              </div>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Enrolled Course</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.flatMap(c =>
                      (c.students || []).map(student => (
                        <tr key={`${c.id}-${student.id}`}>
                          <td>{student.fullName || student.name || 'N/A'}</td>
                          <td>{student.email || 'N/A'}</td>
                          <td>{c.name}</td>
                          <td>
                            <button className="btn btn-sm btn-neon" type="button" onClick={() => openManageClasses(student, c)}>
                              <i className="bi bi-tags me-1"></i>Manage Classes
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    {classes.flatMap(c => c.students || []).length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-4">No students are currently enrolled in your courses.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'submissions' ? 'section-active' : ''}`.trim()} id="section-submissions">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Student Submissions</h2>
                <div className="header-actions">
                  <select id="submissionsClassFilter" className="form-select form-select-sm">
                    <option value="">All classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Assignment</th>
                      <th>Submitted At</th>
                      <th>Grade</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="submissionsTableBody">
                    {teacherSubmissions.map((s) => {
                      const statusBadge = s.status === 'Graded' ? 'success' : s.status === 'Submitted' ? 'warning' : 'secondary'
                      return (
                        <tr key={s.id}>
                          <td>{s.student?.fullName || s.student?.name || 'N/A'}</td>
                          <td>{s.assignment?.title || 'N/A'}</td>
                          <td>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : 'N/A'}</td>
                          <td>{s.grade !== null && s.grade !== undefined ? `${s.grade}%` : '-'}</td>
                          <td>
                            <span className={`badge bg-${statusBadge}`}>{s.status}</span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-neon" type="button" onClick={() => openGradingModal(s)}>
                              <i className="bi bi-check-circle me-1"></i>Grade
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'attendance' ? 'section-active' : ''}`.trim()} id="section-attendance">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Attendance Tracking</h2>
                <div className="header-actions">
                  <select id="attendanceClassFilter" className="form-select form-select-sm" value={attendanceFilters.classId} onChange={(e) => {
                    const cid = e.target.value
                    setAttendanceFilters(p => ({ ...p, classId: cid }))
                  }}>
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input type="date" id="attendanceDateFilter" className="form-control form-control-sm" value={attendanceFilters.date} onChange={(e) => setAttendanceFilters(p => ({ ...p, date: e.target.value }))} />
                  <button className="btn btn-sm btn-outline-light" id="markAllPresentBtn" type="button" onClick={markAllPresent}>
                    <i className="bi bi-check2-all me-1"></i>Mark all present
                  </button>
                  <button className="btn btn-sm btn-neon" id="saveAllAttendanceBtn" type="button" onClick={saveAllAttendance}>
                    <i className="bi bi-save2 me-1"></i>Save all
                  </button>
                  <button className="btn btn-sm btn-outline-light" id="exportAttendanceBtn" type="button" onClick={exportAttendanceCsv}>
                    <i className="bi bi-download me-1"></i>Export
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="attendanceTableBody">
                    {attendanceStudents.map((student) => {
                      const sid = String(student.id)
                      const draft = attendanceDrafts[sid] || { status: 'Present', notes: '', attendanceId: null }
                      const statusBadge = draft.status === 'Present' ? 'success' : draft.status === 'Absent' ? 'danger' : 'warning'
                      return (
                        <tr key={`${sid}-${attendanceFilters.date || ''}`}>
                          <td>{student.fullName || student.name || 'N/A'}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`badge bg-${statusBadge}`}>{draft.status}</span>
                              <select
                                className="form-select form-select-sm"
                                style={{ maxWidth: 150 }}
                                value={draft.status}
                                onChange={(e) => updateAttendanceDraft(sid, { status: e.target.value })}
                              >
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Late">Late</option>
                                <option value="Excused">Excused</option>
                              </select>
                            </div>
                          </td>
                          <td>{attendanceFilters.date}</td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Optional note"
                              value={draft.notes}
                              onChange={(e) => updateAttendanceDraft(sid, { notes: e.target.value })}
                            />
                          </td>
                          <td>
                            <button className="btn btn-sm btn-neon" type="button" onClick={() => saveAttendanceForStudent(student)}>
                              <i className="bi bi-save me-1"></i>{draft.attendanceId ? 'Update' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {attendanceStudents.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-4">
                          {attendanceFilters.classId ? 'No students found in this class.' : 'Select a class to mark attendance.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'progress' ? 'section-active' : ''}`.trim()} id="section-progress">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Student Progress Analysis</h2>
                <div className="header-actions">
                  <select id="progressClassFilter" className="form-select form-select-sm">
                    <option value="">Select a class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-3 g-md-4" id="progressGrid">
                {grades.map((g) => {
                  const avg = Math.round((g.assignment1 + g.assignment2 + g.assignment3) / 3)
                  const progressPercent = avg
                  return (
                    <div className="col-md-6 col-lg-4" key={g.studentId}>
                      <div className="progress-card">
                        <h4>{g.name}</h4>
                        <div className="progress-bar-custom">
                          <span style={{ width: `${progressPercent}%` }}></span>
                        </div>
                        <div className="progress-meta">
                          <span>Average: {avg}%</span>
                          <span>{avg >= 80 ? '✓ Excellent' : avg >= 60 ? '→ Good' : '⚠ Needs Help'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </main>
      </div>

      <SimpleModal open={gradingOpen} onClose={() => setGradingOpen(false)} labelledBy="gradingModalLabel">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="gradingModalLabel">Grade Submission</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setGradingOpen(false)}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Student</label>
                <input className="form-control" value={selectedSubmission?.student?.fullName || selectedSubmission?.student?.name || 'N/A'} readOnly />
              </div>
              <div className="mb-3">
                <label className="form-label">Assignment</label>
                <input className="form-control" value={selectedSubmission?.assignment?.title || 'N/A'} readOnly />
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Grade (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="form-control"
                    value={gradingForm.grade}
                    onChange={(e) => setGradingForm((prev) => ({ ...prev, grade: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={gradingForm.status}
                    onChange={(e) => setGradingForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Graded">Graded</option>
                    <option value="Reviewed">Reviewed</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setGradingOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveGrade}>
                Save Grade
              </button>
            </div>
          </div>
        </div>
      </SimpleModal>

      {/* Edit Assignment Modal */}
      <SimpleModal open={editAssignmentOpen} onClose={() => setEditAssignmentOpen(false)} labelledBy="editAssignmentModalLabel">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editAssignmentModalLabel">
                Edit Assignment
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditAssignmentOpen(false)}></button>
            </div>
            <div className="modal-body">
              {editAssignment ? (
                <form id="editAssignmentFormModal" onSubmit={(e) => e.preventDefault()}>
                  <div className="row mb-3">
                    <div className="col-md-8">
                      <label className="form-label">Assignment Title</label>
                      <input type="text" className="form-control" id="editAssignmentTitle" required value={editAssignment.title} onChange={(e) => setEditAssignment((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select className="form-select" id="editAssignmentStatus" required value={editAssignment.status} onChange={(e) => setEditAssignment((p) => ({ ...p, status: e.target.value }))}>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                        <option value="Upcoming">Upcoming</option>
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Class</label>
                      <select className="form-select" id="editAssignmentClass" required value={editAssignment.classId} onChange={(e) => setEditAssignment((p) => ({ ...p, classId: e.target.value }))}>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Due Date</label>
                      <input type="date" className="form-control" id="editAssignmentDate" required value={editAssignment.dueDate} onChange={(e) => setEditAssignment((p) => ({ ...p, dueDate: e.target.value }))} />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Total Students in Class</label>
                      <input type="number" className="form-control" id="editAssignmentTotal" readOnly value={classes.find((c) => c.id === Number(editAssignment.classId))?.students || 0} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Submissions Received</label>
                      <input type="number" className="form-control" id="editAssignmentSubmissions" value={editAssignment.submissions} onChange={(e) => setEditAssignment((p) => ({ ...p, submissions: e.target.value }))} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description/Instructions</label>
                    <textarea className="form-control" id="editAssignmentDescription" rows={4} placeholder="Add assignment details, instructions, or notes..." value={editAssignment.description || ''} onChange={(e) => setEditAssignment((p) => ({ ...p, description: e.target.value }))}></textarea>
                  </div>

                  <input type="hidden" id="editAssignmentId" value={editAssignment.id} readOnly />
                </form>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-danger" id="deleteAssignmentBtn" onClick={deleteAssignmentFromModal}>
                Delete Assignment
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditAssignmentOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" id="saveAssignmentChanges" onClick={saveAssignmentChanges}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </SimpleModal>

      {/* Edit Test Modal */}
      <SimpleModal open={editTestOpen} onClose={() => setEditTestOpen(false)} labelledBy="editTestModalLabel">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="editTestModalLabel">
                Edit Test
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditTestOpen(false)}></button>
            </div>
            <div className="modal-body">
              {editTest ? (
                <form id="editTestFormModal" onSubmit={(e) => e.preventDefault()}>
                  <div className="row mb-3">
                    <div className="col-md-8">
                      <label className="form-label">Test Title</label>
                      <input type="text" className="form-control" id="editTestTitle" required value={editTest.title} onChange={(e) => setEditTest((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select className="form-select" id="editTestStatus" required value={editTest.status} onChange={(e) => setEditTest((p) => ({ ...p, status: e.target.value }))}>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Active">Active</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Class</label>
                      <select className="form-select" id="editTestClass" required value={editTest.classId} onChange={(e) => setEditTest((p) => ({ ...p, classId: e.target.value }))}>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Test Date</label>
                      <input type="date" className="form-control" id="editTestDate" required value={editTest.testDate} onChange={(e) => setEditTest((p) => ({ ...p, testDate: e.target.value }))} />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Duration (Minutes)</label>
                      <input type="number" className="form-control" id="editTestDuration" min={5} required value={editTest.duration} onChange={(e) => setEditTest((p) => ({ ...p, duration: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Total Marks</label>
                      <input type="number" className="form-control" id="editTestMarks" min={1} required value={editTest.totalMarks} onChange={(e) => setEditTest((p) => ({ ...p, totalMarks: e.target.value }))} />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Description/Instructions</label>
                    <textarea className="form-control" id="editTestDescription" rows={4} placeholder="Add test details, topics, objectives, or special instructions..." value={editTest.description || ''} onChange={(e) => setEditTest((p) => ({ ...p, description: e.target.value }))}></textarea>
                  </div>

                  <input type="hidden" id="editTestId" value={editTest.id} readOnly />
                </form>
              ) : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-danger" id="deleteTestBtn" onClick={deleteTestFromModal}>
                Delete Test
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditTestOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" id="saveTestChanges" onClick={saveTestChanges}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </SimpleModal>

      {/* Manage Classes Modal */}
      <SimpleModal open={manageClassesOpen} onClose={() => setManageClassesOpen(false)} labelledBy="manageClassesModalLabel">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="manageClassesModalLabel">
                Assign Classes for {selectedStudentForClass?.fullName || selectedStudentForClass?.name}
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setManageClassesOpen(false)}></button>
            </div>
            <div className="modal-body">
              <p className="small text-muted mb-3">Course: {selectedCourseForClass?.name}</p>
              {selectedCourseForClass?.subject ? (
                <div className="d-flex flex-column gap-3 mb-3">
                  {selectedCourseForClass.subject.split(',').map(sub => sub.trim()).filter(Boolean).map(className => {
                    const existingAssignment = studentAssignedClasses.find(c => c.className === className)
                    const isChecked = !!existingAssignment
                    return (
                      <div key={className} className="p-2 border border-secondary rounded">
                        <div className="form-check mb-2">
                          <input type="checkbox" className="form-check-input" checked={isChecked} onChange={e => {
                            if (e.target.checked) setStudentAssignedClasses(p => [...p, { className, schedule: '' }])
                            else setStudentAssignedClasses(p => p.filter(c => c.className !== className))
                          }} />
                          <label className="form-check-label ms-2 fw-bold">{className}</label>
                        </div>
                        {isChecked && (
                          <div className="ms-4">
                            <label className="form-label small mb-1">Class Schedule (Time/Day)</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="e.g. Mon 10 AM"
                              value={existingAssignment.schedule || ''}
                              onChange={e => {
                                const newSchedule = e.target.value
                                setStudentAssignedClasses(p => p.map(c => c.className === className ? { ...c, schedule: newSchedule } : c))
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-secondary">No specific classes are defined for this course.</p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setManageClassesOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveStudentClasses}>Schedule Class</button>
            </div>
          </div>
        </div>
      </SimpleModal>
      {confirmModal}
    </>
  )
}

function StudentDashboard({ onLogout, authedUser }) {
  const { user } = useContext(AuthContext)


  useEffect(() => {
    import('../css/teacher-dashboard.css')
  }, [])

  useEffect(() => {
    document.title = 'Student Dashboard – Task Management System'
  }, [])

  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState('sidebarCollapsed', false)
  const [activeSection, setActiveSection] = useState('overview')

  const currentStudent = useMemo(() => {
    const name = user?.rawUser?.fullName || user?.rawUser?.name || user?.email?.split('@')[0] || 'Student'
    return { id: safeNumber(user?.rawUser?.id), name }
  }, [user])

  const [classes, setClasses] = useState([])
  const [assignedClasses, setAssignedClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [tests, setTests] = useState([])
  const [grades, setGrades] = useState([])
  const [attendance, setAttendance] = useState([])
  const [studentSubmissions, setStudentSubmissions] = useState([])

  const studentId = currentStudent.id

  const loadStudentData = useCallback(async () => {
    if (!studentId || !user?.token) return

    try {
      const [c, a, t, att, s, sc] = await Promise.all([
        api.getCoursesByStudent(user.token, studentId, onLogout),
        api.getAssignmentsByStudent(user.token, studentId, onLogout),
        api.getExamsByStudent(user.token, studentId, onLogout),
        api.getAttendanceByStudent(user.token, studentId, onLogout),
        api.getSubmissionsByStudent(user.token, studentId, onLogout),
        api.getStudentClassesByStudent(user.token, studentId, onLogout)
      ])
      setClasses(c || [])
      setAssignments(a || [])
      setTests(t || [])
      setAttendance(att || [])
      setStudentSubmissions(s || [])
      setAssignedClasses(sc || [])
    } catch (error) {
      console.error("Failed to fetch student data:", error)
    }
  }, [studentId, user?.token, onLogout])

  useEffect(() => {
    loadStudentData()
  }, [loadStudentData])

  const [refreshNonce, setRefreshNonce] = useState(0)

  // Add a manual refresh function
  const refreshStudentData = () => {
    setRefreshNonce(prev => prev + 1)
    loadStudentData()
  }

  const [assignmentFilters, setAssignmentFilters] = useState({ search: '', classId: '', status: '' })
  const [testFilters, setTestFilters] = useState({ search: '', classId: '', status: '' })

  const [submitOpen, setSubmitOpen] = useState(false)
  const [assignmentToSubmit, setAssignmentToSubmit] = useState(null)
  const [submitLink, setSubmitLink] = useState('')
  const submitFileRef = useRef(null)



  const studentClasses = useMemo(() => classes, [classes])
  const myAssignments = useMemo(() => assignments, [assignments])
  const submittedIds = useMemo(
    () => studentSubmissions.map((s) => s.assignment?.id || s.assignmentId || s.id),
    [studentSubmissions],
  )

  const pendingCount = useMemo(() => myAssignments.filter((a) => !submittedIds.includes(a.id) && a.status !== 'Completed').length, [myAssignments, submittedIds])

  const upcomingTests = useMemo(() => {
    const today = new Date()
    return tests.filter((t) => new Date(t.testDate) >= today)
  }, [tests])

  const myAttendance = useMemo(() => attendance.filter((a) => (a.student?.id || a.studentId) === currentStudent.id), [attendance, currentStudent.id])
  const attendancePct = useMemo(() => {
    const present = myAttendance.filter((a) => a.status === 'Present').length
    const total = myAttendance.length
    return total > 0 ? Math.round((present / total) * 100) : 100
  }, [myAttendance])

  const filteredMyAssignments = useMemo(() => {
    const search = assignmentFilters.search.trim().toLowerCase()
    return myAssignments.filter((a) => {
      const isSubmitted = submittedIds.includes(a.id)
      const status = isSubmitted ? 'Submitted' : 'Pending'
      if (search && !a.title.toLowerCase().includes(search)) return false
      if (assignmentFilters.status && status !== assignmentFilters.status) return false
      const assignmentCourseId = a.course?.id || a.courseId || a.classId
      if (assignmentFilters.classId && String(assignmentCourseId) !== String(assignmentFilters.classId)) return false
      return true
    })
  }, [myAssignments, assignmentFilters, submittedIds])

  const myTests = useMemo(() => tests, [tests])
  const filteredMyTests = useMemo(() => {
    const search = testFilters.search.trim().toLowerCase()
    return myTests.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search)) return false
      const testCourseId = t.course?.id || t.courseId || t.classId
      if (testFilters.classId && String(testCourseId) !== String(testFilters.classId)) return false
      if (testFilters.status && t.status !== testFilters.status) return false
      return true
    })
  }, [myTests, testFilters])

  const myGrades = useMemo(() => (grades || []).find((g) => (g.studentId || g.student?.id) === currentStudent.id) || null, [grades, currentStudent.id])

  function openSubmitModal(assignment) {
    setAssignmentToSubmit(assignment)
    setSubmitLink('')
    if (submitFileRef.current) submitFileRef.current.value = ''
    setSubmitOpen(true)
  }

  async function confirmSubmit() {
    if (!assignmentToSubmit || !studentId) return
    try {
      const created = await api.createSubmission(user.token, {
        assignment: { id: assignmentToSubmit.id },
        student: { id: studentId },
        submissionLink: submitLink || '',
        submittedAt: new Date().toISOString(),
        status: 'Submitted'
      }, onLogout)

      setStudentSubmissions(prev => [...prev, created])
      appendActivityLog({
        action: 'Assignment submitted',
        type: 'task',
        details: assignmentToSubmit?.title || 'Assignment submission',
        user: {
          id: user?.rawUser?.id ?? studentId ?? null,
          name: user?.rawUser?.name || user?.email || currentStudent?.name || 'Student',
          email: user?.rawUser?.email || user?.email || '',
          role: 'STUDENT',
        },
      })
      setSubmitOpen(false)
      setRefreshNonce((v) => v + 1)
    } catch (e) {
      toast.error('Error submitting assignment')
    }
  }

  return (
    <>
      {/* preserved inline style from original HTML */}
      <style>{`
        .stat-card.accent-orange { border-left: 4px solid #f97316; }
        .stat-card.accent-orange .stat-icon { color: #f97316; background: rgba(249, 115, 22, 0.1); }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(15, 23, 42, 0.95) inset !important;
          -webkit-text-fill-color: var(--text-main, #e5e7eb) !important;
          transition: background-color 5000s ease-in-out 0s;
          caret-color: var(--text-main, #e5e7eb);
        }
        html[data-theme="light"] input:-webkit-autofill,
        html[data-theme="light"] input:-webkit-autofill:hover,
        html[data-theme="light"] input:-webkit-autofill:focus,
        html[data-theme="light"] input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(241, 245, 249, 0.95) inset !important;
          -webkit-text-fill-color: var(--text-main, #1e293b) !important;
          caret-color: var(--text-main, #1e293b);
        }
      `}</style>

      <div className="layout">
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`.trim()} id="sidebar">
          <button className="sidebar-toggle" id="sidebarToggle" title="Toggle sidebar" type="button" onClick={() => setSidebarCollapsed((v) => !v)}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <div className="sidebar-header">
            <span className="brand-icon">
              <i className="bi bi-backpack"></i>
            </span>
            <div>
              <div className="brand-title">TaskFlow</div>
              <div className="brand-subtitle">Student</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {[
              ['overview', 'bi bi-grid-1x2', 'Overview'],
              ['assignments', 'bi bi-journal-text', 'My Tasks'],
              ['tests', 'bi bi-clock-history', 'Exams'],
              ['classes', 'bi bi-collection', 'My Classes'],
              ['grades', 'bi bi-award', 'Grades'],
              ['attendance', 'bi bi-calendar-check', 'Attendance'],
              ['progress', 'bi bi-bar-chart', 'Progress'],
            ].map(([key, icon, label]) => (
              <button key={key} className={`nav-item ${activeSection === key ? 'active' : ''}`.trim()} data-section={key} onClick={() => setActiveSection(key)}>
                <i className={icon}></i>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <button className="nav-item logout-btn" type="button" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Log out</span>
          </button>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <h1 className="topbar-title">Student Dashboard</h1>
              <p className="topbar-subtitle">
                Welcome back, <span id="studentNameDisplay">{currentStudent.name}</span>
              </p>
            </div>
            <div className="topbar-right">
              <ThemeToggle className="icon-btn" title="Toggle theme" />
              <div className="avatar-pill">
                <span className="avatar-circle">S</span>
                <span className="avatar-text">
                  <span className="avatar-name" id="headerStudentName">
                    {currentStudent.name}
                  </span>
                  <span className="avatar-role">Class 10-A</span>
                </span>
              </div>
            </div>
          </header>

          <section className={`section ${activeSection === 'overview' ? 'section-active' : ''}`.trim()} id="section-overview">
            <div className="row g-3 g-md-4 mb-4">
              <div className="col-md-4">
                <div className="stat-card accent-blue">
                  <div className="stat-label">Pending Tasks</div>
                  <div className="stat-value" id="statPendingTasks">
                    {pendingCount}
                  </div>
                  <div className="stat-meta">
                    <span>
                      <i className="bi bi-journal-arrow-up"></i> Due soon
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="stat-card accent-orange">
                  <div className="stat-label">Upcoming Exams</div>
                  <div className="stat-value" id="statUpcomingExams">
                    {upcomingTests.length}
                  </div>
                  <div className="stat-meta">
                    <span>
                      <i className="bi bi-calendar-event"></i> This month
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="stat-card accent-green">
                  <div className="stat-label">Attendance</div>
                  <div className="stat-value" id="statAttendance">
                    {attendancePct}%
                  </div>
                  <div className="stat-meta">
                    <span id="statAttendanceLabel" className={attendancePct < 75 ? 'text-danger' : ''}>
                      <i className={attendancePct < 75 ? 'bi bi-exclamation-triangle' : 'bi bi-check-circle'}></i>{' '}
                      {attendancePct < 75 ? 'Low attendance' : 'Good standing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-3 g-md-4">
              <div className="col-lg-8">
                <div className="panel">
                  <div className="panel-header">
                    <h2>Upcoming Deadlines</h2>
                  </div>
                  <ul className="deadline-list" id="deadlineList">
                    {filteredMyAssignments.filter((a) => !submittedIds.includes(a.id)).slice(0, 5).map((a) => {
                      const daysLeft = Math.ceil((new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
                      const timeLabel = daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due Today' : 'Overdue'
                      const badgeClass = daysLeft < 0 ? 'text-danger' : daysLeft <= 2 ? 'text-warning' : 'text-success'
                      return (
                        <li key={a.id}>
                          <strong>{a.title}</strong>
                          <span className={badgeClass}>{timeLabel}</span>
                        </li>
                      )
                    })}
                    {pendingCount === 0 ? <li className="text-muted">No pending deadlines.</li> : null}
                  </ul>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="panel">
                  <div className="panel-header d-flex justify-content-between align-items-center">
                    <h2>My Classes</h2>
                    <button className="btn btn-sm btn-outline-info" onClick={refreshStudentData} title="Refresh classes">
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                  <ul className="class-summary" id="classSummary">
                    {studentClasses.map((c) => {
                      const myAssigned = assignedClasses.filter(ac => String(ac.course?.id || ac.courseId) === String(c.id))
                      return (
                        <li key={c.id} className="p-3 border border-secondary border-opacity-50 rounded mb-3 bg-dark bg-opacity-25">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h4 className="m-0 text-neon fs-6">{c.name}</h4>
                            <span className="badge bg-secondary small">{c.subject}</span>
                          </div>
                          <div className="ps-2 border-start border-info border-2">
                            {myAssigned.length > 0 ? (
                              myAssigned.map((asgn, idx) => (
                                <div key={idx} className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="small text-light">{asgn.className}</span>
                                  <div className="d-flex align-items-center text-info small">
                                    <i className="bi bi-clock me-1" style={{ fontSize: '0.8rem' }}></i>
                                    <span>{asgn.schedule || 'Schedule TBD'}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-secondary small fst-italic">No specific sub-classes assigned yet.</div>
                            )}
                          </div>
                        </li>
                      )
                    })}
                    {studentClasses.length === 0 && (
                      <li className="text-center text-muted py-4">You are not enrolled in any courses.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'assignments' ? 'section-active' : ''}`.trim()} id="section-assignments">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>My Assignments</h2>
              </div>

              <div className="filter-bar mb-3">
                <input type="text" id="assignmentSearch" className="form-control form-control-sm" placeholder="Search tasks..." value={assignmentFilters.search} onChange={(e) => setAssignmentFilters((p) => ({ ...p, search: e.target.value }))} />
                <select id="assignmentClassFilter" className="form-select form-select-sm" value={assignmentFilters.classId} onChange={(e) => setAssignmentFilters((p) => ({ ...p, classId: e.target.value }))}>
                  <option value="">All Classes</option>
                  {studentClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select id="assignmentStatusFilter" className="form-select form-select-sm" value={assignmentFilters.status} onChange={(e) => setAssignmentFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Class</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="assignmentsTableBody">
                    {filteredMyAssignments.map((a) => {
                      const isSubmitted = submittedIds.includes(a.id)
                      const status = isSubmitted ? 'Submitted' : 'Pending'
                      const assignmentCourseId = a.course?.id || a.courseId || a.classId
                      const classObj = classes.find((c) => c.id === assignmentCourseId)
                      const statusBadge = isSubmitted ? 'success' : 'warning'
                      return (
                        <tr key={a.id}>
                          <td>{a.title}</td>
                          <td>{classObj?.name || 'N/A'}</td>
                          <td>{a.dueDate}</td>
                          <td>
                            <span className={`badge bg-${statusBadge}`}>{status}</span>
                          </td>
                          <td>
                            {isSubmitted ? (
                              <button className="btn btn-sm btn-outline-secondary" disabled type="button">
                                Done
                              </button>
                            ) : (
                              <button className="btn btn-sm btn-primary" type="button" onClick={() => openSubmitModal(a)}>
                                Submit
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'tests' ? 'section-active' : ''}`.trim()} id="section-tests">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Exams & Tests</h2>
              </div>

              <div className="filter-bar mb-3">
                <input type="text" id="testSearch" className="form-control form-control-sm" placeholder="Search tests..." value={testFilters.search} onChange={(e) => setTestFilters((p) => ({ ...p, search: e.target.value }))} />
                <select id="testClassFilter" className="form-select form-select-sm" value={testFilters.classId} onChange={(e) => setTestFilters((p) => ({ ...p, classId: e.target.value }))}>
                  <option value="">All Classes</option>
                  {studentClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select id="testStatusFilter" className="form-select form-select-sm" value={testFilters.status} onChange={(e) => setTestFilters((p) => ({ ...p, status: e.target.value }))}>
                  <option value="">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Test Title</th>
                      <th>Class</th>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Marks</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="testsTableBody">
                    {filteredMyTests.map((t) => {
                      const testCourseId = t.course?.id || t.courseId || t.classId
                      const classObj = classes.find((c) => c.id === testCourseId)
                      const statusBadge = t.status === 'Active' ? 'success' : t.status === 'Completed' ? 'secondary' : 'info'
                      const actionBtn =
                        t.status === 'Active' ? (
                          <button className="btn btn-sm btn-primary" type="button" onClick={() => toast.info(`Starting test: ${t.title}`)}>
                            Start
                          </button>
                        ) : t.status === 'Completed' ? (
                          <button className="btn btn-sm btn-outline-secondary" disabled type="button">
                            View Result
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-outline-secondary" disabled type="button">
                            Wait
                          </button>
                        )

                      return (
                        <tr key={t.id}>
                          <td>{t.title}</td>
                          <td>{classObj?.name || 'N/A'}</td>
                          <td>{t.testDate}</td>
                          <td>{t.duration} min</td>
                          <td>{t.totalMarks}</td>
                          <td>
                            <span className={`badge bg-${statusBadge}`}>{t.status}</span>
                          </td>
                          <td>{actionBtn}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'classes' ? 'section-active' : ''}`.trim()} id="section-classes">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Enrolled Classes</h2>
              </div>
              <div className="row g-3 g-md-4" id="classesGrid">
                {studentClasses.map((c) => {
                  const myAssigned = assignedClasses.filter(ac => String(ac.course?.id || ac.courseId) === String(c.id))
                  const assignedClassNames = myAssigned.map(ac => ac.className).join(', ')
                  const scheduleInfo = myAssigned.map(ac => `${ac.className}: ${ac.schedule || 'TBD'}`).join(' | ')
                  return (
                  <div className="col-md-6 col-lg-4" key={c.id}>
                    <div className="class-card">
                      <h3>{c.name}</h3>
                      <p>
                        <strong>Assigned Classes:</strong> {assignedClassNames || 'None assigned yet'}
                      </p>
                      <p>
                        <strong>Schedule:</strong> {scheduleInfo || 'No schedule set'}
                      </p>
                      <div className="class-meta">
                        <span>
                          <i className="bi bi-person"></i> Instructor: Teacher
                        </span>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'grades' ? 'section-active' : ''}`.trim()} id="section-grades">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>My Grades</h2>
                <div className="header-actions">
                  <button className="btn btn-sm btn-outline-light" id="exportGradesBtn" type="button" onClick={() => {
                    let csv = 'Subject,Assignment 1,Assignment 2,Assignment 3,Average\n'
                    if (myGrades) {
                      const avg = Math.round((myGrades.assignment1 + myGrades.assignment2 + myGrades.assignment3) / 3)
                      csv += `"General Science / Math",${myGrades.assignment1},${myGrades.assignment2},${myGrades.assignment3},${avg}\n`
                    }
                    downloadCsv(`my_grades_${new Date().toISOString().split('T')[0]}.csv`, csv)
                  }}>
                    <i className="bi bi-download me-1"></i>Export
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Assignment 1</th>
                      <th>Assignment 2</th>
                      <th>Assignment 3</th>
                      <th>Average</th>
                    </tr>
                  </thead>
                  <tbody id="gradesTableBody">
                    {myGrades ? (
                      (() => {
                        const avg = Math.round((myGrades.assignment1 + myGrades.assignment2 + myGrades.assignment3) / 3)
                        return (
                          <tr>
                            <td>General Science / Math</td>
                            <td>{myGrades.assignment1}</td>
                            <td>{myGrades.assignment2}</td>
                            <td>{myGrades.assignment3}</td>
                            <td>
                              <strong>{avg}%</strong>
                            </td>
                          </tr>
                        )
                      })()
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'attendance' ? 'section-active' : ''}`.trim()} id="section-attendance">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>Attendance Record</h2>
                <div className="header-actions">
                  <button className="btn btn-sm btn-outline-light" id="exportAttendanceBtn" type="button" onClick={() => {
                    let csv = 'Date,Status,Notes\n'
                    myAttendance.forEach((a) => {
                      csv += `"${a.date}","${a.status}","${a.notes}"\n`
                    })
                    downloadCsv(`my_attendance_${new Date().toISOString().split('T')[0]}.csv`, csv)
                  }}>
                    <i className="bi bi-download me-1"></i>Export
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-dark align-middle table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody id="attendanceTableBody">
                    {myAttendance.map((a) => {
                      const badge = a.status === 'Present' ? 'success' : 'danger'
                      return (
                        <tr key={a.date}>
                          <td>{a.date}</td>
                          <td>
                            <span className={`badge bg-${badge}`}>{a.status}</span>
                          </td>
                          <td>{a.notes || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={`section ${activeSection === 'progress' ? 'section-active' : ''}`.trim()} id="section-progress">
            <div className="panel mb-3">
              <div className="panel-header">
                <h2>My Progress Analysis</h2>
                <div className="header-actions">
                  <select id="progressClassFilter" className="form-select form-select-sm" value={''} onChange={() => { }}>
                    <option value="">All Classes</option>
                    {studentClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row g-3 g-md-4" id="progressGrid">
                {studentClasses.map((c) => {
                  const avgGrade = myGrades ? Math.round((myGrades.assignment1 + myGrades.assignment2 + myGrades.assignment3) / 3) : 0
                  const present = myAttendance.filter((a) => a.status === 'Present').length
                  const totalAtt = myAttendance.length
                  const attPct = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 100
                  return (
                    <div className="col-md-6" key={c.id}>
                      <div className="stat-card">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="m-0">
                            {c.name} - {c.subject}
                          </h5>
                          <span className="badge bg-primary">Enrolled</span>
                        </div>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between small mb-1">
                            <span>Overall Grade</span>
                            <span>{avgGrade}%</span>
                          </div>
                          <div className="progress" style={{ height: 8 }}>
                            <div className="progress-bar bg-success" role="progressbar" style={{ width: `${avgGrade}%` }}></div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between small mb-1">
                            <span>Attendance</span>
                            <span>{attPct}%</span>
                          </div>
                          <div className="progress" style={{ height: 8 }}>
                            <div className="progress-bar bg-info" role="progressbar" style={{ width: `${attPct}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </main>
      </div>

      <SimpleModal open={submitOpen} onClose={() => setSubmitOpen(false)} labelledBy="submitAssignmentModalTitle">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="submitAssignmentModalTitle">
                Submit Assignment
              </h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={() => setSubmitOpen(false)}></button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to mark <strong><span id="submitTaskTitle">{assignmentToSubmit?.title || ''}</span></strong> as complete?
              </p>
              <div className="mb-3">
                <label className="form-label">Attach Link (Optional)</label>
                <input type="text" id="submitLink" className="form-control" placeholder="https://..." value={submitLink} onChange={(e) => setSubmitLink(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Upload File (Optional)</label>
                <input type="file" id="submitFile" className="form-control" ref={submitFileRef} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSubmitOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" id="confirmSubmitBtn" onClick={confirmSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </SimpleModal>
    </>
  )
}

export default function Dashboard() {
  const { role: roleParam } = useParams()
  const role = normalizeRole(roleParam)
  const navigate = useNavigate()
  const { user, logout } = useContext(AuthContext)

  if (!role) return <main className="p-4">Unknown role. <Link to="/">Go back</Link>.</main>

  function onLogout() {
    appendActivityLog({
      action: `${role} logged out`,
      type: 'login',
      details: `${user?.rawUser?.name || user?.email || role} signed out`,
      user: {
        id: user?.rawUser?.id ?? null,
        name: user?.rawUser?.name || user?.email || '',
        email: user?.rawUser?.email || user?.email || '',
        role: user?.rawUser?.role || role.toUpperCase(),
      },
    })
    logout()
    navigate('/', { replace: true })
  }

  if (role === 'Admin') return <AdminDashboard onLogout={onLogout} />
  if (role === 'Teacher') return <TeacherDashboard onLogout={onLogout} />
  return <StudentDashboard onLogout={onLogout} authedUser={user} />
}

