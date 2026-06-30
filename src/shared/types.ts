// Canonical API response DTOs. The response-shape helpers are annotated to
// return these types, so `tsc` fails if the served shape drifts.

export type Department = { id: number; name: string; shortName: string }
export type Course = { id: number; departmentId: number; name: string }
export type Semester = { id: number; name: string }
export type ExamType = { id: number; name: string }

export type Question = {
  id: number
  title: string
  submissionCount: number
  department: Department
  course: Course
  semester: Semester
  examType: ExamType
}

export type Submission = {
  id: number
  section: string | null
  batch: string | null
  fileSize: number
  createdAt: number
  pdfUrl: string | null
  contributor: {
    id: number
    name: string
    username: string
    image: string | null
  } | null
}

export type User = {
  id: number
  name: string
  email: string
  username: string
  role: 'admin' | 'user'
  image: string | null
  createdAt: number
}

export type Contributor = {
  id: number
  name: string
  username: string
  image: string | null
  submissionCount: number
  createdAt: number
}

export type ContributorSummary = {
  id: number
  name: string
  username: string
  image: string | null
}

export type WatermarkStatus = 'awaiting' | 'completed' | 'failed'

export type ContributorSubmission = {
  id: number
  section: string | null
  batch: string | null
  fileSize: number
  createdAt: number
  pdfUrl: string | null
  question: Question
}

export type ManualSubmission = {
  id: number
  userId: number
  status: 'pending_review' | 'approved' | 'rejected'
  departmentName: string
  departmentShortName: string
  courseName: string
  semesterName: string
  examTypeName: string
  note: string | null
  rejectedReason: string | null
  reviewedBy: number | null
  questionId: number | null
  submissionId: number | null
  pdfUrl: string | null
  createdAt: number
}

export type AutoSubmissionStatus =
  | 'processing'
  | 'needs_review'
  | 'published'
  | 'rejected'
  | 'failed'

// AI auto-submission (user uploads only a PDF; Gemini extracts the metadata).
// Extracted fields are flat + nullable because they're filled asynchronously by
// the queue consumer and may be partial when the AI isn't confident.
export type AutoSubmission = {
  id: number
  status: AutoSubmissionStatus
  isAcceptable: boolean | null
  aiReasoning: string | null
  departmentName: string | null
  departmentShortName: string | null
  courseName: string | null
  semesterName: string | null
  examTypeName: string | null
  section: string | null
  batch: string | null
  extraContext: string | null
  rejectedReason: string | null
  questionId: number | null
  submissionId: number | null
  pdfUrl: string | null
  createdAt: number
}

export type PaginationMeta = {
  page: number
  perPage: number
  total: number
  totalPages: number
}

/** A paginated list response: a `data` array plus pagination `meta`. */
export type Page<T> = { data: T[]; meta: PaginationMeta }

export type FilterOptions = {
  departments: Department[]
  courses: Course[]
  semesters: Semester[]
  examTypes: ExamType[]
}

export type QuestionFilters = {
  page: number
  perPage: number
  departmentId: string
  courseId: string
  semesterId: string
  examTypeId: string
}

// --- Admin ---

export type AdminQuestion = {
  id: number
  title: string
  departmentId: number
  courseId: number
  semesterId: number
  examTypeId: number
  submissionCount: number
  department: Department
  course: Course
  semester: Semester
  examType: ExamType
}

export type AdminSubmission = {
  id: number
  question: { id: number; title: string }
  contributor: { id: number; name: string; username: string; image: string | null } | null
  section: string | null
  batch: string | null
  fileSize: number
  watermarkStatus: WatermarkStatus
  watermarkError: string | null
  pdfUrl: string | null
  watermarkedPdfUrl: string | null
  createdAt: number
}

export type AdminManualSubmission = {
  id: number
  userId: number
  contributor: User
  departmentName: string
  departmentShortName: string
  courseName: string
  semesterName: string
  examTypeName: string
  note: string | null
  status: 'pending_review' | 'approved' | 'rejected'
  rejectedReason: string | null
  reviewedBy: number | null
  reviewer: User | null
  questionId: number | null
  submissionId: number | null
  pdfUrl: string | null
  createdAt: number
}

export type AdminAutoSubmission = {
  id: number
  userId: number
  contributor: User
  status: AutoSubmissionStatus
  isAcceptable: boolean | null
  aiReasoning: string | null
  departmentName: string | null
  departmentShortName: string | null
  courseName: string | null
  semesterName: string | null
  examTypeName: string | null
  section: string | null
  batch: string | null
  extraContext: string | null
  fileSize: number
  processingError: string | null
  rejectedReason: string | null
  reviewedBy: number | null
  reviewer: User | null
  questionId: number | null
  submissionId: number | null
  pdfUrl: string | null
  createdAt: number
}

export type AdminUser = User & { submissionCount: number }

/**
 * Impact of a category merge (departments / courses / semesters / exam types).
 * Returned both as the `preview` of a `dryRun` request and as the `summary` of
 * an applied merge. `coursesMerged` is only present for department merges,
 * where same-named courses across the merged departments are auto-merged.
 */
export type MergeSummary = {
  itemsDeleted: number
  questionsCombined: number
  submissionsMoved: number
  manualSubmissionsMoved: number
  coursesMerged?: number
}

/** `dryRun: true` response — the projected impact, nothing written. */
export type MergePreview<T> = { preview: MergeSummary; keeper: T }

/** Applied-merge response — the surviving entity plus what changed. */
export type MergeResult<T> = { keeper: T; summary: MergeSummary }

/** A single field-level validation issue (from `validate()` on the API). */
export type ApiErrorIssue = { field: string; message: string }

/**
 * Canonical error body returned by the API. Every non-2xx response is shaped
 * `{ error }`; validation failures (400) additionally carry `issues`. The web
 * API client narrows against this when surfacing messages to the user.
 */
export type ApiErrorResponse = { error: string; issues?: ApiErrorIssue[] }
