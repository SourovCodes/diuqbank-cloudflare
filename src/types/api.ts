import type { components } from "./openapi";

export type PaginationMeta = components["schemas"]["PaginationMeta"];
export type FilterOptions = components["schemas"]["FilterOptions"];
export type Question = components["schemas"]["QuestionListItem"];
export type QuestionList = components["schemas"]["QuestionList"];
export type QuestionDetail = components["schemas"]["QuestionDetail"];
export type QuestionSubmissions = components["schemas"]["QuestionSubmissions"];
export type PublicSubmission = components["schemas"]["PublicSubmission"];
export type Contributor = components["schemas"]["Contributor"];
export type ContributorList = components["schemas"]["ContributorList"];
export type ContributorSubmission =
  components["schemas"]["ContributorSubmission"];
export type ContributorSubmissionList =
  components["schemas"]["ContributorSubmissionList"];
export type AuthConfig = components["schemas"]["AuthConfig"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type User = components["schemas"]["User"];
export type ManualSubmission = components["schemas"]["ManualSubmission"];
export type ManualSubmissionList =
  components["schemas"]["ManualSubmissionList"];
export type AutoSubmission = components["schemas"]["AutoSubmission"];
export type AutoSubmissionList = components["schemas"]["AutoSubmissionList"];

export type QuestionFilters = {
  page: number;
  perPage: number;
  departmentId: string;
  courseId: string;
  semesterId: string;
  examTypeId: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type PaginationParams = {
  page: number;
  perPage: number;
};
