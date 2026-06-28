import type {
  FilterOptions, PaginationMeta, Question, QuestionFilters,
  Submission, Contributor, User, ManualSubmission, ContributorSubmission,
  Department, Course, Semester, ExamType,
  AdminQuestion, AdminSubmission, AdminManualSubmission, AdminUser, WatermarkStatus,
  ApiErrorResponse, Page,
} from '@diuqbank/shared/types'

const BASE = import.meta.env.VITE_API_URL ?? 'https://diuqbank.sourovcodes.workers.dev'

/** Error thrown by the API client, carrying the HTTP status so callers can
 * branch on it (e.g. render a 404 page when a resource doesn't exist). */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** True when an error is a 404 from the API — i.e. the resource doesn't exist. */
export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404
}

// When an *authenticated* request comes back 401, the session token is expired
// or revoked. AuthProvider registers a handler here to log the user out so the
// app doesn't sit in a broken half-signed-in state.
let onUnauthorized: (() => void) | null = null

/** Register (or clear, with `null`) the global 401 handler. */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

function notifyIfUnauthorized(status: number) {
  if (status === 401) onUnauthorized?.()
}

// Build a query string from a params object, dropping null/undefined/empty values.
function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export type AdminListParams = { page?: number; perPage?: number }

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

async function authedGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    notifyIfUnauthorized(res.status)
    throw new ApiError(res.status, `API ${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

async function authedPost<T>(path: string, token: string, body: FormData | object): Promise<T> {
  const isForm = body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
    },
    body: isForm ? body : JSON.stringify(body),
  })
  if (!res.ok) {
    notifyIfUnauthorized(res.status)
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(res.status, (err as ApiErrorResponse).error ?? `API ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function authedPatch<T>(path: string, token: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    notifyIfUnauthorized(res.status)
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(res.status, (err as ApiErrorResponse).error ?? `API ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function authedPutFile<T>(path: string, token: string, body: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (!res.ok) {
    notifyIfUnauthorized(res.status)
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new ApiError(res.status, (err as ApiErrorResponse).error ?? `API ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function authedDelete(path: string, token: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    notifyIfUnauthorized(res.status)
    const err = await res.json().catch(() => ({ error: 'Delete failed' }))
    throw new ApiError(res.status, (err as ApiErrorResponse).error ?? `API ${res.status}`)
  }
}

export const api = {
  // --- Public ---
  filterOptions: () => get<FilterOptions>('/filter-options'),

  questions: (filters: QuestionFilters) => {
    const p = new URLSearchParams({ page: String(filters.page), perPage: String(filters.perPage) })
    if (filters.departmentId) p.set('departmentId', filters.departmentId)
    if (filters.courseId) p.set('courseId', filters.courseId)
    if (filters.semesterId) p.set('semesterId', filters.semesterId)
    if (filters.examTypeId) p.set('examTypeId', filters.examTypeId)
    return get<{ data: Question[]; meta: PaginationMeta }>(`/questions?${p}`)
  },

  question: (id: string) => get<Question>(`/questions/${id}`),

  submissions: (id: string) => get<{ data: Submission[] }>(`/questions/${id}/submissions`),

  contributors: (page = 1, perPage = 20) =>
    get<{ data: Contributor[]; meta: PaginationMeta }>(`/contributors?page=${page}&perPage=${perPage}`),

  contributor: (username: string) => get<Contributor>(`/contributors/${username}`),

  contributorSubmissions: (username: string, page = 1) =>
    get<{ data: ContributorSubmission[]; meta: PaginationMeta }>(
      `/contributors/${username}/submissions?page=${page}&perPage=20`
    ),

  // --- Auth ---
  authConfig: () => get<{ googleClientId: string }>('/auth/config'),

  authGoogle: (idToken: string) =>
    fetch(`${BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }).then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Sign-in failed' }))
        throw new Error((err as ApiErrorResponse).error ?? 'Sign-in failed')
      }
      return res.json() as Promise<{ token: string; user: User }>
    }),

  me: (token: string) => authedGet<{ user: User }>('/auth/me', token),

  updateMe: (token: string, data: { name?: string; username?: string }) =>
    authedPatch<{ user: User }>('/auth/me', token, data).then(({ user }) => user),

  uploadImage: (token: string, file: File) => {
    const fd = new FormData()
    fd.append('image', file)
    return authedPutFile<{ user: User }>('/auth/me/image', token, fd).then(({ user }) => user)
  },

  // --- Manual Submissions ---
  createManualSubmission: (token: string, formData: FormData) =>
    authedPost<ManualSubmission>('/manual-submissions', token, formData),

  myManualSubmissions: (token: string, page = 1) =>
    authedGet<{ data: ManualSubmission[]; meta: PaginationMeta }>(
      `/manual-submissions?page=${page}&perPage=20`,
      token
    ),

  getManualSubmission: (token: string, id: number) =>
    authedGet<ManualSubmission>(`/manual-submissions/${id}`, token),

  deleteManualSubmission: (token: string, id: number) =>
    authedDelete(`/manual-submissions/${id}`, token),

  // --- Admin: Departments ---
  adminDepartments: (token: string, params: AdminListParams & { search?: string } = {}) =>
    authedGet<Page<Department>>(`/admin/departments${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminDepartment: (token: string, id: number) =>
    authedGet<Department>(`/admin/departments/${id}`, token),
  createDepartment: (token: string, body: { name: string; shortName: string }) =>
    authedPost<Department>('/admin/departments', token, body),
  updateDepartment: (token: string, id: number, body: { name?: string; shortName?: string }) =>
    authedPatch<Department>(`/admin/departments/${id}`, token, body),
  deleteDepartment: (token: string, id: number) =>
    authedDelete(`/admin/departments/${id}`, token),

  // --- Admin: Courses ---
  adminCourses: (token: string, params: AdminListParams & { departmentId?: number | string; search?: string } = {}) =>
    authedGet<Page<Course>>(`/admin/courses${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminCourse: (token: string, id: number) =>
    authedGet<Course>(`/admin/courses/${id}`, token),
  createCourse: (token: string, body: { departmentId: number; name: string }) =>
    authedPost<Course>('/admin/courses', token, body),
  updateCourse: (token: string, id: number, body: { departmentId?: number; name?: string }) =>
    authedPatch<Course>(`/admin/courses/${id}`, token, body),
  deleteCourse: (token: string, id: number) =>
    authedDelete(`/admin/courses/${id}`, token),

  // --- Admin: Semesters ---
  adminSemesters: (token: string, params: AdminListParams & { search?: string } = {}) =>
    authedGet<Page<Semester>>(`/admin/semesters${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminSemester: (token: string, id: number) =>
    authedGet<Semester>(`/admin/semesters/${id}`, token),
  createSemester: (token: string, body: { name: string }) =>
    authedPost<Semester>('/admin/semesters', token, body),
  updateSemester: (token: string, id: number, body: { name?: string }) =>
    authedPatch<Semester>(`/admin/semesters/${id}`, token, body),
  deleteSemester: (token: string, id: number) =>
    authedDelete(`/admin/semesters/${id}`, token),

  // --- Admin: Exam Types ---
  adminExamTypes: (token: string, params: AdminListParams & { search?: string } = {}) =>
    authedGet<Page<ExamType>>(`/admin/exam-types${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminExamType: (token: string, id: number) =>
    authedGet<ExamType>(`/admin/exam-types/${id}`, token),
  createExamType: (token: string, body: { name: string }) =>
    authedPost<ExamType>('/admin/exam-types', token, body),
  updateExamType: (token: string, id: number, body: { name?: string }) =>
    authedPatch<ExamType>(`/admin/exam-types/${id}`, token, body),
  deleteExamType: (token: string, id: number) =>
    authedDelete(`/admin/exam-types/${id}`, token),

  // --- Admin: Questions ---
  adminQuestions: (
    token: string,
    params: AdminListParams & { departmentId?: number | string; courseId?: number | string; semesterId?: number | string; examTypeId?: number | string } = {}
  ) => authedGet<Page<AdminQuestion>>(`/admin/questions${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminQuestion: (token: string, id: number) =>
    authedGet<AdminQuestion>(`/admin/questions/${id}`, token),
  createQuestion: (token: string, body: { departmentId: number; courseId: number; semesterId: number; examTypeId: number }) =>
    authedPost<AdminQuestion>('/admin/questions', token, body),
  updateQuestion: (token: string, id: number, body: { departmentId?: number; courseId?: number; semesterId?: number; examTypeId?: number }) =>
    authedPatch<AdminQuestion>(`/admin/questions/${id}`, token, body),
  deleteQuestion: (token: string, id: number) =>
    authedDelete(`/admin/questions/${id}`, token),

  // --- Admin: Submissions ---
  adminSubmissions: (
    token: string,
    params: AdminListParams & { questionId?: number | string; userId?: number | string; watermarkStatus?: WatermarkStatus | '' } = {}
  ) => authedGet<Page<AdminSubmission>>(`/admin/submissions${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminSubmission: (token: string, id: number) =>
    authedGet<AdminSubmission>(`/admin/submissions/${id}`, token),
  createSubmission: (token: string, formData: FormData) =>
    authedPost<AdminSubmission>('/admin/submissions', token, formData),
  updateSubmission: (
    token: string,
    id: number,
    body: { questionId?: number; userId?: number; section?: string | null; batch?: string | null; watermarkStatus?: WatermarkStatus }
  ) => authedPatch<AdminSubmission>(`/admin/submissions/${id}`, token, body),
  replaceSubmissionPdf: (token: string, id: number, formData: FormData) =>
    authedPutFile<AdminSubmission>(`/admin/submissions/${id}/pdf`, token, formData),
  deleteSubmission: (token: string, id: number) =>
    authedDelete(`/admin/submissions/${id}`, token),

  // --- Admin: Manual Submissions ---
  adminManualSubmissions: (
    token: string,
    params: AdminListParams & { status?: ManualSubmission['status'] | ''; userId?: number | string } = {}
  ) => authedGet<Page<AdminManualSubmission>>(`/admin/manual-submissions${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminManualSubmission: (token: string, id: number) =>
    authedGet<AdminManualSubmission>(`/admin/manual-submissions/${id}`, token),
  updateManualSubmission: (
    token: string,
    id: number,
    body: { departmentName?: string; departmentShortName?: string; courseName?: string; semesterName?: string; examTypeName?: string }
  ) => authedPatch<AdminManualSubmission>(`/admin/manual-submissions/${id}`, token, body),
  approveManualSubmission: (token: string, id: number) =>
    authedPost<AdminManualSubmission>(`/admin/manual-submissions/${id}/approve`, token, {}),
  rejectManualSubmission: (token: string, id: number, reason: string) =>
    authedPost<AdminManualSubmission>(`/admin/manual-submissions/${id}/reject`, token, { reason }),
  adminDeleteManualSubmission: (token: string, id: number) =>
    authedDelete(`/admin/manual-submissions/${id}`, token),

  // --- Admin: Users ---
  adminUsers: (token: string, params: AdminListParams & { role?: User['role'] | ''; search?: string } = {}) =>
    authedGet<Page<AdminUser>>(`/admin/users${qs({ page: 1, perPage: 20, ...params })}`, token),
  adminUser: (token: string, id: number) =>
    authedGet<AdminUser>(`/admin/users/${id}`, token),
  updateUser: (token: string, id: number, body: { name?: string; username?: string; role?: User['role'] }) =>
    authedPatch<AdminUser>(`/admin/users/${id}`, token, body),
}
