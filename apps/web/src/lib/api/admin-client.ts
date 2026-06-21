import type { components } from "@diuqbank/api-client";

import { bearerHeaders, request } from "./client";

type Schemas = components["schemas"];
type PaginationMeta = Schemas["PaginationMeta"];

export type ListResult<Item> = { data: Item[]; meta: PaginationMeta };

/** Query params for a list request. `page`/`perPage`/`search` plus any resource filter (e.g. `departmentId`). */
export type ListParams = Record<string, string | number | undefined>;

const toQuery = (params: ListParams) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

/**
 * Typed CRUD wrapper for one admin resource, built on the shared `request` helper
 * and a `Bearer` token. Mirrors the API's `/admin/<resource>` contract:
 * `list` returns `{ data, meta }`; `remove` resolves to the 204 empty body.
 */
export function createResourceClient<Item, Create, Update>(basePath: string) {
  return {
    list: (token: string, params: ListParams = {}) =>
      request<ListResult<Item>>(`${basePath}${toQuery(params)}`, {
        headers: bearerHeaders(token),
      }),
    get: (token: string, id: number) =>
      request<Item>(`${basePath}/${id}`, { headers: bearerHeaders(token) }),
    create: (token: string, input: Create) =>
      request<Item>(basePath, {
        method: "POST",
        headers: bearerHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(input),
      }),
    update: (token: string, id: number, input: Update) =>
      request<Item>(`${basePath}/${id}`, {
        method: "PATCH",
        headers: bearerHeaders(token, { "Content-Type": "application/json" }),
        body: JSON.stringify(input),
      }),
    remove: (token: string, id: number) =>
      request<null>(`${basePath}/${id}`, {
        method: "DELETE",
        headers: bearerHeaders(token),
      }),
  };
}

export type ResourceClient<Item, Create, Update> = ReturnType<
  typeof createResourceClient<Item, Create, Update>
>;

/** The minimal surface `useAdminList` needs — any client (incl. the bespoke submissions one) fits. */
export type AdminLister<Item> = {
  list: (token: string, params?: ListParams) => Promise<ListResult<Item>>;
};

export type AdminQuestion = Schemas["AdminQuestion"];
export type AdminSubmission = Schemas["AdminSubmission"];
export type AdminUser = Schemas["AdminUser"];

export const departmentsClient = createResourceClient<
  Schemas["Department"],
  Schemas["CreateDepartment"],
  Schemas["UpdateDepartment"]
>("/admin/departments");

export const coursesClient = createResourceClient<
  Schemas["Course"],
  Schemas["CreateCourse"],
  Schemas["UpdateCourse"]
>("/admin/courses");

export const semestersClient = createResourceClient<
  Schemas["Semester"],
  Schemas["CreateSemester"],
  Schemas["UpdateSemester"]
>("/admin/semesters");

export const examTypesClient = createResourceClient<
  Schemas["ExamType"],
  Schemas["CreateExamType"],
  Schemas["UpdateExamType"]
>("/admin/exam-types");

export const questionsClient = createResourceClient<
  Schemas["AdminQuestion"],
  Schemas["CreateQuestion"],
  Schemas["UpdateQuestion"]
>("/admin/questions");

// Users are created only via Google sign-in, so there is no `create` — `never` makes
// `usersClient.create` uncallable while the rest of the CRUD surface stays typed.
export const usersClient = createResourceClient<
  Schemas["AdminUser"],
  never,
  Schemas["UpdateUser"]
>("/admin/users");

export type SubmissionCreateInput = {
  pdf: File;
  questionId: number;
  userId?: number;
  section?: string;
  batch?: string;
};

/**
 * Submissions don't fit the JSON CRUD mould: create and PDF-replace are multipart.
 * As with `uploadProfileImage` in `client.ts`, never set `Content-Type` on a `FormData`
 * body — the browser adds the `multipart/form-data` boundary itself.
 */
export const submissionsClient = {
  list: (token: string, params: ListParams = {}) =>
    request<ListResult<Schemas["AdminSubmission"]>>(
      `/admin/submissions${toQuery(params)}`,
      { headers: bearerHeaders(token) },
    ),
  get: (token: string, id: number) =>
    request<Schemas["AdminSubmission"]>(`/admin/submissions/${id}`, {
      headers: bearerHeaders(token),
    }),
  create: (token: string, input: SubmissionCreateInput) => {
    const body = new FormData();
    body.set("pdf", input.pdf);
    body.set("questionId", String(input.questionId));
    if (input.userId != null) body.set("userId", String(input.userId));
    if (input.section) body.set("section", input.section);
    if (input.batch) body.set("batch", input.batch);
    return request<Schemas["AdminSubmission"]>("/admin/submissions", {
      method: "POST",
      headers: bearerHeaders(token),
      body,
    });
  },
  update: (token: string, id: number, input: Schemas["UpdateSubmission"]) =>
    request<Schemas["AdminSubmission"]>(`/admin/submissions/${id}`, {
      method: "PATCH",
      headers: bearerHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(input),
    }),
  replacePdf: (token: string, id: number, pdf: File) => {
    const body = new FormData();
    body.set("pdf", pdf);
    return request<Schemas["AdminSubmission"]>(`/admin/submissions/${id}/pdf`, {
      method: "PUT",
      headers: bearerHeaders(token),
      body,
    });
  },
  remove: (token: string, id: number) =>
    request<null>(`/admin/submissions/${id}`, {
      method: "DELETE",
      headers: bearerHeaders(token),
    }),
};
