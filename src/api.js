const BASE_URL = "https://task-management-system-react.onrender.com/api"

export const fetchWithAuth = async (url, token, options = {}, onLogout) => {
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  try {
    const fullUrl = `${BASE_URL}${url}`
    console.log(`[API Request] ${options.method || 'GET'} ${fullUrl}`)
    
    const res = await fetch(fullUrl, { ...options, headers })
    
    if (res.status === 401) {
      console.warn(`[API 401] Session expired for ${url}`)
      if (onLogout) onLogout()
      throw new Error('Session expired')
    }
    
    if (res.status === 403) {
      console.error(`[API 403] Forbidden access to ${url}. Check roles/permissions.`)
      // Do NOT logout on 403, just throw error so the UI can show it
      throw new Error('Forbidden: You do not have permission to access this resource.')
    }

    if (!res.ok) {
      const errorMsg = await res.text().catch(() => 'Unknown error')
      console.error(`[API Error] ${res.status} ${url}: ${errorMsg}`)
      throw new Error(errorMsg || res.statusText)
    }

    return res
  } catch (err) {
    console.error(`[API Exception] ${url}:`, err.message)
    throw err
  }
}

// User API
export const getUsers = (token, onLogout) =>
  fetchWithAuth('/users', token, {}, onLogout)
    .then(res => res.json())

export const createUser = (token, userData, onLogout) =>
  fetchWithAuth('/users', token,
    { method: 'POST', body: JSON.stringify(userData) },
    onLogout).then(res => res.json())

export const updateUser = (token, id, userData, onLogout) =>
  fetchWithAuth(`/users/${id}`, token,
    { method: 'PUT', body: JSON.stringify(userData) },
    onLogout).then(res => res.json())

export const deleteUser = (token, id, onLogout) =>
  fetchWithAuth(`/users/${id}`, token,
    { method: 'DELETE' },
    onLogout)
// Course API
export const getCoursesByTeacher = (token, teacherId, onLogout) => fetchWithAuth(`/courses/teacher/${teacherId}`, token, {}, onLogout).then(res => res.json())
export const getCoursesByStudent = (token, studentId, onLogout) => fetchWithAuth(`/courses/student/${studentId}`, token, {}, onLogout).then(res => res.json())
export const createCourse = (token, data, onLogout) => fetchWithAuth('/courses', token, { method: 'POST', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const updateCourse = (token, id, data, onLogout) => fetchWithAuth(`/courses/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const deleteCourse = (token, id, onLogout) => fetchWithAuth(`/courses/${id}`, token, { method: 'DELETE' }, onLogout)
export const assignTeacherToCourse = (token, courseId, teacherId, onLogout) => fetchWithAuth(`/courses/${courseId}/assign-teacher/${teacherId}`, token, { method: 'PUT' }, onLogout).then(res => res.json())
export const assignStudentToCourse = (token, courseId, studentId, onLogout) => fetchWithAuth(`/courses/${courseId}/assign-student/${studentId}`, token, { method: 'PUT' }, onLogout).then(res => res.json())

// Assignment API
export const getAssignmentsByTeacher = (token, teacherId, onLogout) => fetchWithAuth(`/assignments/teacher/${teacherId}`, token, {}, onLogout).then(res => res.json())
export const getAssignmentsByStudent = (token, studentId, onLogout) => fetchWithAuth(`/assignments/student/${studentId}`, token, {}, onLogout).then(res => res.json())
export const createAssignment = (token, data, onLogout) => fetchWithAuth('/assignments', token, { method: 'POST', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const updateAssignment = (token, id, data, onLogout) => fetchWithAuth(`/assignments/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const deleteAssignment = (token, id, onLogout) => fetchWithAuth(`/assignments/${id}`, token, { method: 'DELETE' }, onLogout)

// Exam API
export const getExamsByTeacher = (token, teacherId, onLogout) => fetchWithAuth(`/exams/teacher/${teacherId}`, token, {}, onLogout).then(res => res.json())
export const getExamsByStudent = (token, studentId, onLogout) => fetchWithAuth(`/exams/student/${studentId}`, token, {}, onLogout).then(res => res.json())
export const createExam = (token, data, onLogout) => fetchWithAuth('/exams', token, { method: 'POST', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const updateExam = (token, id, data, onLogout) => fetchWithAuth(`/exams/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const deleteExam = (token, id, onLogout) => fetchWithAuth(`/exams/${id}`, token, { method: 'DELETE' }, onLogout)

// Submission API
export const getSubmissionsByStudent = (token, studentId, onLogout) => fetchWithAuth(`/submissions/student/${studentId}`, token, {}, onLogout).then(res => res.json())
export const getSubmissionsByTeacher = (token, teacherId, onLogout) => fetchWithAuth(`/submissions/teacher/${teacherId}`, token, {}, onLogout).then(res => res.json())
export const createSubmission = (token, data, onLogout) => fetchWithAuth('/submissions', token, { method: 'POST', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const updateSubmission = (token, id, data, onLogout) => fetchWithAuth(`/submissions/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }, onLogout).then(res => res.json())

// Attendance API
export const getAttendanceByTeacher = (token, teacherId, onLogout) => fetchWithAuth(`/attendances/teacher/${teacherId}`, token, {}, onLogout).then(res => res.json())
export const getAttendanceByStudent = (token, studentId, onLogout) => fetchWithAuth(`/attendances/student/${studentId}`, token, {}, onLogout).then(res => res.json())
export const createAttendance = (token, data, onLogout) => fetchWithAuth('/attendances', token, { method: 'POST', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const updateAttendance = (token, id, data, onLogout) => fetchWithAuth(`/attendances/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }, onLogout).then(res => res.json())
export const deleteAttendance = (token, id, onLogout) => fetchWithAuth(`/attendances/${id}`, token, { method: 'DELETE' }, onLogout)

// Activity Logs
export const getActivityLogs = (token, onLogout) => fetchWithAuth('/activitylogs', token, {}, onLogout).then(res => res.json())

// Generic GET for Students
export const getCourses = (token, onLogout) => fetchWithAuth('/courses', token, {}, onLogout).then(res => res.json())
export const getAssignments = (token, onLogout) => fetchWithAuth('/assignments', token, {}, onLogout).then(res => res.json())
export const getExams = (token, onLogout) => fetchWithAuth('/exams', token, {}, onLogout).then(res => res.json())
export const getAttendances = (token, onLogout) => fetchWithAuth('/attendances', token, {}, onLogout).then(res => res.json())

// Student Classes API
export const getStudentClasses = (token, courseId, onLogout) => fetchWithAuth(`/student-classes/course/${courseId}`, token, {}, onLogout).then(res => res.json())
export const getStudentClassesByStudent = (token, studentId, onLogout) => fetchWithAuth(`/student-classes/student/${studentId}`, token, {}, onLogout).then(res => res.json())
export const assignStudentClasses = (token, data, onLogout) => fetchWithAuth('/student-classes/assign', token, { method: 'POST', body: JSON.stringify(data) }, onLogout)
