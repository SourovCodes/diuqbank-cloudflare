import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getAdminAutoSubmission,
  getAdminAutoSubmissions,
  getAdminManualSubmission,
  getAdminManualSubmissions,
  getAdminQuestions,
  getAdminSubmission,
  getAdminSubmissions,
  getAdminUser,
  getAdminUsers,
  type AdminAutoSubmissionParams,
  type AdminManualSubmissionParams,
  type AdminQuestionParams,
  type AdminSubmissionParams,
  type AdminUserParams,
  type TaxonomyApi,
  type TaxonomyParams,
} from "../api";

// --- Manual submissions ---
export function useAdminManualSubmissions(params: AdminManualSubmissionParams) {
  return useQuery({
    queryKey: ["admin", "manual-submissions", params],
    queryFn: () => getAdminManualSubmissions(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminManualSubmission(id?: string) {
  return useQuery({
    queryKey: ["admin", "manual-submission", id],
    queryFn: () => getAdminManualSubmission(id as string),
    enabled: !!id,
  });
}

// --- Auto submissions ---
export function useAdminAutoSubmissions(params: AdminAutoSubmissionParams) {
  return useQuery({
    queryKey: ["admin", "auto-submissions", params],
    queryFn: () => getAdminAutoSubmissions(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminAutoSubmission(id?: string) {
  return useQuery({
    queryKey: ["admin", "auto-submission", id],
    queryFn: () => getAdminAutoSubmission(id as string),
    enabled: !!id,
    // Poll while the AI pipeline is still working so review status stays live.
    refetchInterval: (query) =>
      query.state.data?.status === "processing" ? 3000 : false,
  });
}

// --- Users ---
export function useAdminUsers(params: AdminUserParams) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => getAdminUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id?: string) {
  return useQuery({
    queryKey: ["admin", "user", id],
    queryFn: () => getAdminUser(id as string),
    enabled: !!id,
  });
}

// --- Questions ---
export function useAdminQuestions(params: AdminQuestionParams) {
  return useQuery({
    queryKey: ["admin", "questions", params],
    queryFn: () => getAdminQuestions(params),
    placeholderData: keepPreviousData,
  });
}

// --- Published submissions ---
export function useAdminSubmissions(params: AdminSubmissionParams) {
  return useQuery({
    queryKey: ["admin", "submissions", params],
    queryFn: () => getAdminSubmissions(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminSubmission(id?: string) {
  return useQuery({
    queryKey: ["admin", "submission", id],
    queryFn: () => getAdminSubmission(id as string),
    enabled: !!id,
  });
}

// --- Taxonomy (departments, courses, semesters, exam-types) ---
export function useTaxonomy(
  resource: string,
  api: TaxonomyApi,
  params: TaxonomyParams
) {
  return useQuery({
    queryKey: ["admin", resource, params],
    queryFn: () => api.list(params),
    placeholderData: keepPreviousData,
  });
}
