// Compile-time contract check: the types generated from the OpenAPI doc
// (./openapi.ts) must stay mutually assignable with the API's canonical DTO
// types. A failure here means a response schema in apps/api/src/openapi.ts
// drifted from apps/api/src/shared/types.ts — fix whichever side is wrong,
// then rerun `pnpm run api:types`.
//
// Everything here is type-level only; nothing exists at runtime.

import type * as dto from "diuqbank-api/shared/types";
import type { components } from "./openapi";

type Schemas = components["schemas"];

type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;

export type ContractChecks = [
  Expect<Eq<Schemas["Department"], dto.Department>>,
  Expect<Eq<Schemas["Course"], dto.Course>>,
  Expect<Eq<Schemas["Semester"], dto.Semester>>,
  Expect<Eq<Schemas["ExamType"], dto.ExamType>>,
  Expect<Eq<Schemas["PaginationMeta"], dto.PaginationMeta>>,
  Expect<Eq<Schemas["FilterOptions"], dto.FilterOptions>>,
  Expect<Eq<Schemas["QuestionListItem"], dto.Question>>,
  Expect<Eq<Schemas["QuestionDetail"], dto.Question>>,
  Expect<Eq<Schemas["PublicSubmission"], dto.Submission>>,
  Expect<Eq<Schemas["User"], dto.User>>,
  Expect<Eq<Schemas["Contributor"], dto.Contributor>>,
  Expect<Eq<Schemas["ContributorSubmission"], dto.ContributorSubmission>>,
  Expect<Eq<Schemas["AutoSubmission"], dto.AutoSubmission>>,
  Expect<Eq<Schemas["ManualSubmission"], dto.ManualSubmission>>,
  Expect<Eq<Schemas["AdminQuestion"], dto.AdminQuestion>>,
  Expect<Eq<Schemas["AdminSubmission"], dto.AdminSubmission>>,
  Expect<Eq<Schemas["AdminSubmissionDetail"], dto.AdminSubmissionDetail>>,
  Expect<Eq<Schemas["AdminAutoSubmission"], dto.AdminAutoSubmission>>,
  Expect<Eq<Schemas["AdminAutoSubmissionDetail"], dto.AdminAutoSubmissionDetail>>,
  Expect<Eq<Schemas["AdminManualSubmission"], dto.AdminManualSubmission>>,
  Expect<Eq<Schemas["AdminManualSubmissionDetail"], dto.AdminManualSubmissionDetail>>,
  Expect<Eq<Schemas["AdminContributorStats"], dto.AdminContributorStats>>,
  Expect<Eq<Schemas["TaxonomyMatches"], dto.TaxonomyMatches>>,
  Expect<Eq<Schemas["AdminUser"], dto.AdminUser>>,
  Expect<Eq<Schemas["BackupArtifact"], dto.BackupArtifact>>,
  Expect<Eq<Schemas["BackupMeta"], dto.BackupMeta>>,
  Expect<Eq<Schemas["MergeSummary"], dto.MergeSummary>>,
  Expect<Eq<Schemas["ErrorResponse"], dto.ApiErrorResponse>>,
];
