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
  viewCount: number
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
  viewCount: number
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

// The embedded question is a slim variant: no submissionCount/viewCount
// (the contributor listing doesn't aggregate those).
export type ContributorSubmission = {
  id: number
  section: string | null
  batch: string | null
  fileSize: number
  viewCount: number
  createdAt: number
  pdfUrl: string | null
  question: {
    id: number
    title: string
    department: Department
    course: Course
    semester: Semester
    examType: ExamType
  }
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
  viewCount: number
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
  viewCount: number
  watermarkStatus: WatermarkStatus
  watermarkError: string | null
  pdfUrl: string | null
  watermarkedPdfUrl: string | null
  createdAt: number
}

/**
 * Detail variant of `AdminSubmission`: also carries the id of the auto
 * submission this live submission was published from (null when it wasn't
 * created through that pipeline).
 */
export type AdminSubmissionDetail = AdminSubmission & {
  autoSubmissionId: number | null
}

export type AdminAutoSubmission = {
  id: number
  userId: number
  /** Source submission id when bulk-imported from legacy diuqbank.com; else null. */
  legacyId: number | null
  /** View count carried over from the legacy site; else null. */
  legacyViews: number | null
  contributor: User
  status: AutoSubmissionStatus
  isAcceptable: boolean | null
  aiReasoning: string | null
  departmentName: string | null
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

/**
 * Review-history overview of a contributor, shown alongside a submission under
 * review so admins can judge the uploader's track record at a glance.
 */
export type AdminContributorStats = {
  /** Live submissions currently on the site (`users.submission_count`). */
  liveSubmissionCount: number
  autoPublished: number
  autoRejected: number
  autoPendingReview: number
}

/** Detail variant of `AdminAutoSubmission`: adds the contributor's track record. */
export type AdminAutoSubmissionDetail = AdminAutoSubmission & {
  contributorStats: AdminContributorStats
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
