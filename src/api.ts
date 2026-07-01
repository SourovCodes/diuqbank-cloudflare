import type {
  AuthConfig,
  AuthResponse,
  AutoSubmission,
  AutoSubmissionList,
  Contributor,
  ContributorList,
  ContributorSubmissionList,
  FilterOptions,
  ManualSubmission,
  ManualSubmissionList,
  PaginationParams,
  QuestionDetail,
  QuestionFilters,
  QuestionList,
  QuestionSubmissions,
  User,
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
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const get = <T>(path: string, params?: QueryParams): Promise<T> =>
  request<T>(path, { params });

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
