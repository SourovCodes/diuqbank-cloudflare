import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { WatermarkStatus, ManualSubmission, User, AutoSubmissionStatus } from '@diuqbank/shared/types'

type Filters = Record<string, string | number | undefined>

function useListQuery<T>(key: string, token: string | null, filters: Filters, fn: () => Promise<T>) {
  return useQuery({
    queryKey: [key, ...Object.values(filters)],
    queryFn: fn,
    enabled: !!token,
    placeholderData: keepPreviousData,
  })
}

export function useAdminDepartments(token: string | null, page = 1, search = '') {
  return useListQuery('admin-departments', token, { page, search }, () =>
    api.adminDepartments(token!, { page, search }))
}

export function useAdminCourses(token: string | null, page = 1, departmentId = '', search = '') {
  return useListQuery('admin-courses', token, { page, departmentId, search }, () =>
    api.adminCourses(token!, { page, departmentId, search }))
}

export function useAdminSemesters(token: string | null, page = 1, search = '') {
  return useListQuery('admin-semesters', token, { page, search }, () =>
    api.adminSemesters(token!, { page, search }))
}

export function useAdminExamTypes(token: string | null, page = 1, search = '') {
  return useListQuery('admin-exam-types', token, { page, search }, () =>
    api.adminExamTypes(token!, { page, search }))
}

export function useAdminQuestions(
  token: string | null,
  page = 1,
  filters: { departmentId?: string; courseId?: string; semesterId?: string; examTypeId?: string } = {}
) {
  return useListQuery('admin-questions', token, { page, ...filters }, () =>
    api.adminQuestions(token!, { page, ...filters }))
}

export function useAdminSubmissions(
  token: string | null,
  page = 1,
  filters: { questionId?: string; userId?: string; watermarkStatus?: WatermarkStatus | '' } = {}
) {
  return useListQuery('admin-submissions', token, { page, ...filters }, () =>
    api.adminSubmissions(token!, { page, ...filters }))
}

export function useAdminManualSubmissions(
  token: string | null,
  page = 1,
  filters: { status?: ManualSubmission['status'] | ''; userId?: string } = {}
) {
  return useListQuery('admin-manual-submissions', token, { page, ...filters }, () =>
    api.adminManualSubmissions(token!, { page, ...filters }))
}

export function useAdminAutoSubmissions(
  token: string | null,
  page = 1,
  filters: { status?: AutoSubmissionStatus | ''; userId?: string } = {}
) {
  return useQuery({
    queryKey: ['admin-auto-submissions', page, filters.status, filters.userId],
    queryFn: () => api.adminAutoSubmissions(token!, { page, ...filters }),
    enabled: !!token,
    placeholderData: keepPreviousData,
    // Keep refreshing while any row is still being processed by the AI pipeline.
    refetchInterval: query =>
      query.state.data?.data.some(s => s.status === 'processing') ? 4000 : false,
  })
}

export function useAdminUsers(
  token: string | null,
  page = 1,
  filters: { role?: User['role'] | ''; search?: string } = {}
) {
  return useListQuery('admin-users', token, { page, ...filters }, () =>
    api.adminUsers(token!, { page, ...filters }))
}
