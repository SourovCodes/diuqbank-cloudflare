import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  getAdminManualSubmission,
  getAdminManualSubmissions,
  getAdminQuestion,
  getAdminQuestions,
  getAdminSubmission,
  getAdminSubmissions,
  getAdminUser,
  getAdminUsers,
  getBackupMeta,
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

export function useAdminQuestion(id?: string) {
  return useQuery({
    queryKey: ["admin", "question", id],
    queryFn: () => getAdminQuestion(id as string),
    enabled: !!id,
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

// --- Backups ---
export function useBackupMeta() {
  return useQuery({
    queryKey: ["admin", "backups"],
    queryFn: getBackupMeta,
    // A single-item status view; don't spin on transient errors.
    retry: false,
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
