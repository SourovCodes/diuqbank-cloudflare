import "server-only";

import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  createApiClient,
  type Contributor,
  type ContributorSubmission,
  type FilterOptions,
  type PublicSubmission,
  type QuestionDetail,
  type QuestionListItem,
  type PaginationMeta,
} from "@diuqbank/api-client";

export type QuestionListParams = {
  page?: number;
  perPage?: number;
  departmentId?: number;
  courseId?: number;
  semesterId?: number;
  examTypeId?: number;
};

export type QuestionListResponse = {
  data: QuestionListItem[];
  meta: PaginationMeta;
};

export type PageParams = { page?: number; perPage?: number };

export type ContributorListResponse = {
  data: Contributor[];
  meta: PaginationMeta;
};

export type ContributorSubmissionsResponse = {
  data: ContributorSubmission[];
  meta: PaginationMeta;
};

const getClient = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  const baseUrl = env.API_PUBLIC_ORIGIN.replace(/\/$/, "");

  const serviceFetch: typeof globalThis.fetch = async (input, init) => {
    if (typeof input === "string" || input instanceof URL) {
      return env.API.fetch(input, init);
    }

    // Next's development proxy and workerd use different Request realms, so
    // pass the URL and a plain init object across the Service Binding boundary.
    const method = init?.method ?? input.method;
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : (init?.body ?? (await input.clone().arrayBuffer()));

    return env.API.fetch(input.url, {
      method,
      headers: init?.headers ?? Array.from(input.headers.entries()),
      body,
      redirect: init?.redirect ?? input.redirect,
    });
  };

  return createApiClient({ baseUrl, fetch: serviceFetch });
});

const apiError = (operation: string, response: Response) =>
  new Error(`${operation} failed with ${response.status} ${response.statusText}`);

export const getAuthConfig = cache(async (): Promise<string> => {
  const client = await getClient();
  const { data, response } = await client.GET("/auth/config");

  if (!data) throw apiError("Loading authentication config", response);
  return data.googleClientId;
});

export const getFilterOptions = cache(async (): Promise<FilterOptions> => {
  const client = await getClient();
  const { data, response } = await client.GET("/filter-options");

  if (!data) throw apiError("Loading question filters", response);
  return data;
});

export const getQuestions = async (
  params: QuestionListParams,
): Promise<QuestionListResponse> => {
  const client = await getClient();
  const { data, response } = await client.GET("/questions", {
    params: { query: params },
  });

  if (!data) throw apiError("Loading questions", response);
  return data;
};

export const getQuestion = cache(
  async (id: number): Promise<QuestionDetail | null> => {
    const client = await getClient();
    const { data, response } = await client.GET("/questions/{id}", {
      params: { path: { id } },
    });

    if (response.status === 404) return null;
    if (!data) throw apiError("Loading question", response);
    return data;
  },
);

export const getQuestionSubmissions = cache(
  async (id: number): Promise<PublicSubmission[] | null> => {
    const client = await getClient();
    const { data, response } = await client.GET(
      "/questions/{id}/submissions",
      { params: { path: { id } } },
    );

    if (response.status === 404) return null;
    if (!data) throw apiError("Loading question submissions", response);
    return data.data;
  },
);

export const getContributors = async (
  params: PageParams,
): Promise<ContributorListResponse> => {
  const client = await getClient();
  const { data, response } = await client.GET("/contributors", {
    params: { query: params },
  });

  if (!data) throw apiError("Loading contributors", response);
  return data;
};

export const getContributor = cache(
  async (username: string): Promise<Contributor | null> => {
    const client = await getClient();
    const { data, response } = await client.GET("/contributors/{username}", {
      params: { path: { username } },
    });

    if (response.status === 404) return null;
    if (!data) throw apiError("Loading contributor", response);
    return data;
  },
);

export const getContributorSubmissions = cache(
  async (
    username: string,
    params: PageParams,
  ): Promise<ContributorSubmissionsResponse | null> => {
    const client = await getClient();
    const { data, response } = await client.GET(
      "/contributors/{username}/submissions",
      { params: { path: { username }, query: params } },
    );

    if (response.status === 404) return null;
    if (!data) throw apiError("Loading contributor submissions", response);
    return data;
  },
);
