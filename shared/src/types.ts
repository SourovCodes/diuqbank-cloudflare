// Canonical API response DTOs — the single source of truth for the JSON shapes
// the API returns and the web consumes. The API's response-shape helpers
// (api/src/lib/user-shape.ts, admin-shape.ts) are annotated to return these
// types, so `tsc` fails if the served shape ever drifts from this contract.

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

export type ContributorSubmission = {
  id: number
  section: string | null
  batch: string | null
  fileSize: number
  createdAt: number
  pdfUrl: string | null
  question: Question
}

export type AutoSubmission = {
  id: number
  status: 'processing' | 'awaiting_confirmation' | 'failed' | 'confirmed'
  fileSize: number
  pdfUrl: string | null
  aiResult: {
    isAcceptable: boolean
    rejectionReason: string | null
    departmentName: string | null
    departmentShortName: string | null
    courseName: string | null
    semesterName: string | null
    examTypeName: string | null
    section: string | null
    batch: string | null
    reasoning: string
  } | null
  errorMessage: string | null
  submissionId: number | null
  createdAt: number
  updatedAt: number
}

export type ManualSubmission = {
  id: number
  status: 'pending_review' | 'approved' | 'rejected'
  department: Department
  course: Course
  semester: Semester
  examType: ExamType
  rejectedReason: string | null
  questionId: number | null
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

export type WatermarkStatus = 'awaiting' | 'completed' | 'failed'

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
  department: { id: number | null; name: string; shortName: string }
  course: { id: number | null; departmentId: number | null; name: string }
  semester: { id: number | null; name: string }
  examType: { id: number | null; name: string }
  status: 'pending_review' | 'approved' | 'rejected'
  rejectedReason: string | null
  reviewedBy: number | null
  reviewer: User | null
  questionId: number | null
  submissionId: number | null
  pdfUrl: string | null
  createdAt: number
}

export type AdminUser = User & { submissionCount: number }
