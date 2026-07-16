import {
  useQuery,
  useQueryClient,
  keepPreviousData,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getManualSubmission,
  getManualSubmissions,
  getContributor,
  getContributors,
  getContributorSubmissions,
  getFilterOptions,
  getQuestions,
  getQuestion,
  getSubmissions,
} from "../api";
import type {
  Contributor,
  ContributorList,
  PaginationParams,
  QuestionDetail,
  QuestionFilters,
  QuestionList,
} from "../types/api";

function findCachedQuestion(
  queryClient: QueryClient,
  id?: string
): QuestionDetail | undefined {
  const questionId = Number(id);
  if (!Number.isFinite(questionId)) return undefined;

  const cachedLists = queryClient.getQueriesData<QuestionList>({
    queryKey: ["questions"],
  });

  for (const [, list] of cachedLists) {
    const question = list?.data.find((item) => item.id === questionId);
    if (question) return question;
  }

  return undefined;
}

function findCachedContributor(
  queryClient: QueryClient,
  username?: string
): Contributor | undefined {
  if (!username) return undefined;

  const cachedLists = queryClient.getQueriesData<ContributorList>({
    queryKey: ["contributors"],
  });

  for (const [, list] of cachedLists) {
    const contributor = list?.data.find((item) => item.username === username);
    if (contributor) return contributor;
  }

  return undefined;
}

// Filter options are basically static — cache them for the whole session.
export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: getFilterOptions,
    staleTime: Infinity,
  });
}

export function useQuestions(params: QuestionFilters) {
  return useQuery({
    queryKey: ["questions", params],
    queryFn: () => getQuestions(params),
    placeholderData: keepPreviousData, // keep old list visible while paging/filtering
  });
}

export function useQuestion(id?: string, initialQuestion?: QuestionDetail) {
  const queryClient = useQueryClient();
  const questionId = Number(id);
  const hydratedQuestion =
    initialQuestion?.id === questionId
      ? initialQuestion
      : findCachedQuestion(queryClient, id);

  return useQuery({
    queryKey: ["question", id],
    queryFn: () => getQuestion(id as string),
    enabled: !!id,
    initialData: hydratedQuestion,
    initialDataUpdatedAt: hydratedQuestion ? 0 : undefined,
  });
}

export function useSubmissions(id?: string) {
  return useQuery({
    queryKey: ["submissions", id],
    queryFn: () => getSubmissions(id as string),
    enabled: !!id,
  });
}

export function useContributors(params: PaginationParams) {
  return useQuery({
    queryKey: ["contributors", params],
    queryFn: () => getContributors(params),
    placeholderData: keepPreviousData,
  });
}

export function useContributor(username?: string, initialContributor?: Contributor) {
  const queryClient = useQueryClient();
  const hydratedContributor =
    initialContributor?.username === username
      ? initialContributor
      : findCachedContributor(queryClient, username);

  return useQuery({
    queryKey: ["contributor", username],
    queryFn: () => getContributor(username as string),
    enabled: !!username,
    initialData: hydratedContributor,
    initialDataUpdatedAt: hydratedContributor ? 0 : undefined,
  });
}

export function useContributorSubmissions(
  username: string | undefined,
  params: PaginationParams
) {
  return useQuery({
    queryKey: ["contributor-submissions", username, params],
    queryFn: () => getContributorSubmissions(username as string, params),
    enabled: !!username,
    placeholderData: keepPreviousData,
  });
}

export function useManualSubmissions(params: PaginationParams) {
  return useQuery({
    queryKey: ["manual-submissions", params],
    queryFn: () => getManualSubmissions(params),
    placeholderData: keepPreviousData,
  });
}

export function useManualSubmission(id?: string) {
  return useQuery({
    queryKey: ["manual-submission", id],
    queryFn: () => getManualSubmission(id as string),
    enabled: !!id,
  });
}
