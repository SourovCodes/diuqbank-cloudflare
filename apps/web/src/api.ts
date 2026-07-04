import type {
  AdminAutoSubmission,
  AdminAutoSubmissionList,
  AdminManualSubmission,
  AdminManualSubmissionList,
  AdminQuestion,
  AdminQuestionList,
  AdminSubmission,
  AdminSubmissionList,
  AdminUser,
  AdminUserList,
  AuthConfig,
  AuthResponse,
  AutoSubmission,
  AutoSubmissionList,
  AutoSubmissionStatus,
  Contributor,
  ContributorList,
  ContributorSubmissionList,
  Course,
  CourseList,
  CreateQuestion,
  Department,
  DepartmentList,
  ExamType,
  ExamTypeList,
  FilterOptions,
  ManualSubmission,
  ManualSubmissionList,
  ManualSubmissionStatus,
  MergeRequest,
  MergeSummary,
  PaginationParams,
  QuestionDetail,
  QuestionFilters,
  QuestionList,
  QuestionSubmissions,
  Semester,
  SemesterList,
  UpdateAutoSubmission,
  UpdateManualSubmission,
  UpdateQuestion,
  UpdateSubmission,
  UpdateUser,
  User,
  UserRole,
} from "./types/api";

const PRODUCTION_API_BASE = "https://diuqbank-api-prod.sourov-cse.workers.dev";
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = (configuredApiBase || (import.meta.env.DEV ? "/api" : PRODUCTION_API_BASE))
  .replace(/\/+$/, "");

const TOKEN_KEY = "diuqbank_token";
let authToken: string | null = readStoredToken();

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export const getAuthToken = (): string | null => authToken;

export function setAuthToken(token: string | null): void {
  authToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage disabled — token lives in memory only for this session */
  }
}

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  method?: string;
  params?: QueryParams;
  json?: unknown;
  body?: BodyInit;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(opts.params || {})) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let body = opts.body;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(url, { method: opts.method ?? "GET", headers, body });
  if (!res.ok) {
    // A stale/invalid token should log the user out rather than loop on 401s.
    if (res.status === 401 && authToken) setAuthToken(null);
    const message = await readErrorMessage(res);
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  // 202 (view buffered) and 204 responses have no body.
  if (res.status === 202 || res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string, params?: QueryParams): Promise<T> =>
  request<T>(path, { params });

const post = <T>(path: string, json?: unknown): Promise<T> =>
  request<T>(path, { method: "POST", json });

const patch = <T>(path: string, json?: unknown): Promise<T> =>
  request<T>(path, { method: "PATCH", json });

const del = (path: string): Promise<void> =>
  request<void>(path, { method: "DELETE" });

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error || body.message || null;
  } catch {
    return null;
  }
}

// --- Public catalogue ---
export const getQuestions = (params: QuestionFilters): Promise<QuestionList> =>
  get("/questions", params);

export const getQuestion = (id: string): Promise<QuestionDetail> =>
  get(`/questions/${id}`);

export const getSubmissions = (id: string): Promise<QuestionSubmissions> =>
  get(`/questions/${id}/submissions`);

/**
 * Records one view for a submission. `token` is a single-use Google
 * reCAPTCHA v3 token; the increment is flushed into `viewCount` by a backend
 * cron, so it is not reflected in reads immediately.
 */
export const recordSubmissionView = (
  id: number,
  token: string
): Promise<void> => request(`/submissions/${id}/views`, { method: "POST", json: { token } });

export const getFilterOptions = (): Promise<FilterOptions> =>
  get("/filter-options");

export const getContributors = (
  params: PaginationParams
): Promise<ContributorList> => get("/contributors", params);

export const getContributor = (username: string): Promise<Contributor> =>
  get(`/contributors/${encodeURIComponent(username)}`);

export const getContributorSubmissions = (
  username: string,
  params: PaginationParams
): Promise<ContributorSubmissionList> =>
  get(`/contributors/${encodeURIComponent(username)}/submissions`, params);

// --- Auth & profile ---
export const getAuthConfig = (): Promise<AuthConfig> => get("/auth/config");

export const googleSignIn = (idToken: string): Promise<AuthResponse> =>
  request("/auth/google", { method: "POST", json: { idToken } });

export const getMe = (): Promise<User> =>
  request<{ user: User }>("/auth/me").then((r) => r.user);

export const updateProfile = (body: {
  name?: string;
  username?: string;
}): Promise<User> =>
  request<{ user: User }>("/auth/me", { method: "PATCH", json: body }).then(
    (r) => r.user
  );

export const uploadProfileImage = (file: File): Promise<User> => {
  const form = new FormData();
  form.append("image", file);
  return request<{ user: User }>("/auth/me/image", {
    method: "PUT",
    body: form,
  }).then((r) => r.user);
};

// --- Manual submissions ---
export const getManualSubmissions = (
  params: PaginationParams
): Promise<ManualSubmissionList> => get("/manual-submissions", params);

export const getManualSubmission = (
  id: string | number
): Promise<ManualSubmission> => get(`/manual-submissions/${id}`);

export const createManualSubmission = (
  form: FormData
): Promise<ManualSubmission> =>
  request("/manual-submissions", { method: "POST", body: form });

export const deleteManualSubmission = (id: number): Promise<void> =>
  request(`/manual-submissions/${id}`, { method: "DELETE" });

// --- Auto submissions ---
export const getAutoSubmissions = (
  params: PaginationParams
): Promise<AutoSubmissionList> => get("/auto-submissions", params);

export const getAutoSubmission = (
  id: string | number
): Promise<AutoSubmission> => get(`/auto-submissions/${id}`);

export const createAutoSubmission = (form: FormData): Promise<AutoSubmission> =>
  request("/auto-submissions", { method: "POST", body: form });

export const deleteAutoSubmission = (id: number): Promise<void> =>
  request(`/auto-submissions/${id}`, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Admin — every endpoint requires a bearer token from a `role: "admin"` account
// ---------------------------------------------------------------------------

export type AdminManualSubmissionParams = PaginationParams & {
  status?: ManualSubmissionStatus;
  userId?: number;
  departmentName?: string;
  courseName?: string;
  semesterName?: string;
  examTypeName?: string;
};

export type AdminAutoSubmissionParams = PaginationParams & {
  status?: AutoSubmissionStatus;
  userId?: number;
};

export type AdminUserParams = PaginationParams & {
  search?: string;
  role?: UserRole;
};

export type AdminQuestionParams = PaginationParams & {
  departmentId?: number;
  courseId?: number;
  semesterId?: number;
  examTypeId?: number;
};

export type AdminSubmissionParams = PaginationParams & {
  questionId?: number;
  userId?: number;
  watermarkStatus?: "awaiting" | "completed" | "failed";
};

export type TaxonomyParams = PaginationParams & {
  search?: string;
  departmentId?: number; // courses only
};

// --- Manual submissions ---
export const getAdminManualSubmissions = (
  params: AdminManualSubmissionParams
): Promise<AdminManualSubmissionList> =>
  get("/admin/manual-submissions", params);

export const getAdminManualSubmission = (
  id: string | number
): Promise<AdminManualSubmission> => get(`/admin/manual-submissions/${id}`);

export const updateAdminManualSubmission = (
  id: number,
  body: UpdateManualSubmission
): Promise<AdminManualSubmission> =>
  patch(`/admin/manual-submissions/${id}`, body);

export const approveManualSubmission = (
  id: number
): Promise<AdminManualSubmission> =>
  post(`/admin/manual-submissions/${id}/approve`);

export const rejectManualSubmission = (
  id: number,
  reason: string
): Promise<AdminManualSubmission> =>
  post(`/admin/manual-submissions/${id}/reject`, { reason });

export const deleteAdminManualSubmission = (id: number): Promise<void> =>
  del(`/admin/manual-submissions/${id}`);

// --- Auto submissions ---
export const getAdminAutoSubmissions = (
  params: AdminAutoSubmissionParams
): Promise<AdminAutoSubmissionList> => get("/admin/auto-submissions", params);

export const getAdminAutoSubmission = (
  id: string | number
): Promise<AdminAutoSubmission> => get(`/admin/auto-submissions/${id}`);

export const updateAdminAutoSubmission = (
  id: number,
  body: UpdateAutoSubmission
): Promise<AdminAutoSubmission> => patch(`/admin/auto-submissions/${id}`, body);

export const approveAutoSubmission = (
  id: number
): Promise<AdminAutoSubmission> =>
  post(`/admin/auto-submissions/${id}/approve`);

export const rejectAutoSubmission = (
  id: number,
  reason: string
): Promise<AdminAutoSubmission> =>
  post(`/admin/auto-submissions/${id}/reject`, { reason });

export const reprocessAutoSubmission = (
  id: number
): Promise<AdminAutoSubmission> =>
  post(`/admin/auto-submissions/${id}/reprocess`);

export const deleteAdminAutoSubmission = (id: number): Promise<void> =>
  del(`/admin/auto-submissions/${id}`);

// --- Users ---
export const getAdminUsers = (params: AdminUserParams): Promise<AdminUserList> =>
  get("/admin/users", params);

export const getAdminUser = (id: string | number): Promise<AdminUser> =>
  get(`/admin/users/${id}`);

export const updateAdminUser = (
  id: number,
  body: UpdateUser
): Promise<AdminUser> => patch(`/admin/users/${id}`, body);

export const deleteAdminUser = (id: number): Promise<void> =>
  del(`/admin/users/${id}`);

// --- Questions ---
export const getAdminQuestions = (
  params: AdminQuestionParams
): Promise<AdminQuestionList> => get("/admin/questions", params);

export const getAdminQuestion = (id: string | number): Promise<AdminQuestion> =>
  get(`/admin/questions/${id}`);

export const createAdminQuestion = (
  body: CreateQuestion
): Promise<AdminQuestion> => post("/admin/questions", body);

export const updateAdminQuestion = (
  id: number,
  body: UpdateQuestion
): Promise<AdminQuestion> => patch(`/admin/questions/${id}`, body);

export const deleteAdminQuestion = (id: number): Promise<void> =>
  del(`/admin/questions/${id}`);

// --- Published submissions ---
export const getAdminSubmissions = (
  params: AdminSubmissionParams
): Promise<AdminSubmissionList> => get("/admin/submissions", params);

export const getAdminSubmission = (
  id: string | number
): Promise<AdminSubmission> => get(`/admin/submissions/${id}`);

export const updateAdminSubmission = (
  id: number,
  body: UpdateSubmission
): Promise<AdminSubmission> => patch(`/admin/submissions/${id}`, body);

export const deleteAdminSubmission = (id: number): Promise<void> =>
  del(`/admin/submissions/${id}`);

export const incrementSubmissionViews = (
  id: number,
  by = 1
): Promise<AdminSubmission> => post(`/admin/submissions/${id}/views`, { by });

export const replaceSubmissionPdf = (
  id: number,
  file: File
): Promise<AdminSubmission> => {
  const form = new FormData();
  form.append("pdf", file);
  return request(`/admin/submissions/${id}/pdf`, { method: "PUT", body: form });
};

// --- Taxonomy (departments, courses, semesters, exam-types) ---
// Each entity shares the same CRUD + merge shape, so wrappers are generated
// from the resource path to avoid four near-identical copies.
type TaxonomyList = DepartmentList | CourseList | SemesterList | ExamTypeList;
type TaxonomyItem = Department | Course | Semester | ExamType;

/** `summary` is set on a real merge, `preview` when `dryRun: true`. */
export type MergeResponse = {
  keeper: TaxonomyItem;
  summary?: MergeSummary;
  preview?: MergeSummary;
};

const taxonomyApi = <List extends TaxonomyList, Item extends TaxonomyItem>(
  resource: string
) => ({
  list: (params: TaxonomyParams): Promise<List> =>
    get(`/admin/${resource}`, params),
  create: (body: Record<string, unknown>): Promise<Item> =>
    post(`/admin/${resource}`, body),
  update: (id: number, body: Record<string, unknown>): Promise<Item> =>
    patch(`/admin/${resource}/${id}`, body),
  remove: (id: number): Promise<void> => del(`/admin/${resource}/${id}`),
  merge: (body: MergeRequest): Promise<MergeResponse> =>
    post(`/admin/${resource}/merge`, body),
});

export const departmentsApi = taxonomyApi<DepartmentList, Department>(
  "departments"
);
export const coursesApi = taxonomyApi<CourseList, Course>("courses");
export const semestersApi = taxonomyApi<SemesterList, Semester>("semesters");
export const examTypesApi = taxonomyApi<ExamTypeList, ExamType>("exam-types");

export type TaxonomyApi = ReturnType<typeof taxonomyApi>;
