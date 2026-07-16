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

export type ManualSubmissionStatus = 'pending' | 'published' | 'rejected'

// Manual submission (user uploads a PDF and types the taxonomy values as free
// text; an admin reviews it before it becomes a live submission). The name
// fields are nullable because rows migrated from the old AI pipeline may be
// partial.
export type ManualSubmission = {
  id: number
  status: ManualSubmissionStatus
  departmentName: string | null
  courseName: string | null
  semesterName: string | null
  examTypeName: string | null
  section: string | null
  batch: string | null
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
 * Detail variant of `AdminSubmission`: also carries the id of the manual
 * submission this live submission was published from (null when it wasn't
 * created through that pipeline).
 */
export type AdminSubmissionDetail = AdminSubmission & {
  manualSubmissionId: number | null
}

export type AdminManualSubmission = {
  id: number
  userId: number
  /** Source submission id when bulk-imported from legacy diuqbank.com; else null. */
  legacyId: number | null
  /** View count carried over from the legacy site; else null. */
  legacyViews: number | null
  contributor: User
  status: ManualSubmissionStatus
  departmentName: string | null
  courseName: string | null
  semesterName: string | null
  examTypeName: string | null
  section: string | null
  batch: string | null
  fileSize: number
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
  manualPublished: number
  manualRejected: number
  manualPending: number
}

/**
 * Which existing taxonomy entity each free-text value on a manual submission
 * resolves to (case-insensitive match), or null when no entity with that name
 * exists yet. Approving requires every id to be non-null — the admin either
 * creates the missing entity or edits the value to match an existing one.
 */
export type TaxonomyMatches = {
  departmentId: number | null
  /** Matched within the matched department; always null while the department is unmatched. */
  courseId: number | null
  semesterId: number | null
  examTypeId: number | null
}

/**
 * Detail variant of `AdminManualSubmission`: adds the contributor's track
 * record and the taxonomy resolution used to gate the approve action.
 */
export type AdminManualSubmissionDetail = AdminManualSubmission & {
  contributorStats: AdminContributorStats
  taxonomyMatches: TaxonomyMatches
}

export type AdminUser = User & { submissionCount: number }

// --- Admin: backups ---

/** One artifact produced by a backup run (the files manifest or the DB dump). */
export type BackupArtifact = {
  /** Object key in the private backup bucket. */
  key: string
  /** Size in bytes, or null if this artifact failed to generate. */
  size: number | null
  status: 'ok' | 'failed'
  /** Failure detail when `status` is `failed`, else null. */
  error: string | null
}

/** Metadata describing the most recent backup run (from `backup-meta.json`). */
export type BackupMeta = {
  /** ISO 8601 timestamp of when the run started. */
  generatedAt: string
  /** Number of referenced files captured in the manifest. */
  fileCount: number
  manifest: BackupArtifact
  database: BackupArtifact
}

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
