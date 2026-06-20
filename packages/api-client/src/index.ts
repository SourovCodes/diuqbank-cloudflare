import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

export type { components, operations, paths } from "./schema";

export type Department = components["schemas"]["Department"];
export type Course = components["schemas"]["Course"];
export type FilterOption = components["schemas"]["Semester"];
export type FilterOptions = components["schemas"]["FilterOptions"];
export type QuestionListItem = components["schemas"]["QuestionListItem"];
export type QuestionDetail = components["schemas"]["QuestionDetail"];
export type PublicSubmission = components["schemas"]["PublicSubmission"];
export type PaginationMeta = components["schemas"]["PaginationMeta"];

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
};

export const createApiClient = ({ baseUrl, fetch }: ApiClientOptions) =>
  createClient<paths>({ baseUrl, fetch });
