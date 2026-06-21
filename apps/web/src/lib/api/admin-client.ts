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
