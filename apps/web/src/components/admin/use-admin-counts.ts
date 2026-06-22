"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import {
  type AdminLister,
  coursesClient,
  departmentsClient,
  examTypesClient,
  questionsClient,
  semestersClient,
  submissionsClient,
  usersClient,
} from "@/lib/api/admin-client";

export type AdminCounts = {
  questions: number | null;
  departments: number | null;
  courses: number | null;
  semesters: number | null;
  examTypes: number | null;
  users: number | null;
  submissions: number | null;
};

/**
 * Total row counts for every admin resource, for the dashboard stat cards. Each total
 * comes from a cheap `list({ perPage: 1 })` call (the API returns `meta.total`); all
 * requests fire in parallel and a single failure degrades that one count to `null`
 * (rendered as "—") rather than failing the page. No new API needed.
 */
export function useAdminCounts() {
  const { token } = useAuth();
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLoading(true);
    });

    const total = (client: AdminLister<unknown>) =>
      client
        .list(token, { perPage: 1 })
        .then((res) => res.meta.total)
        .catch(() => null);

    Promise.all([
      total(questionsClient),
      total(departmentsClient),
      total(coursesClient),
      total(semestersClient),
      total(examTypesClient),
      total(usersClient),
      total(submissionsClient),
    ])
      .then(
        ([
          questions,
          departments,
          courses,
          semesters,
          examTypes,
          users,
          submissions,
        ]) => {
          if (!active) return;
          setCounts({
            questions,
            departments,
            courses,
            semesters,
            examTypes,
            users,
            submissions,
          });
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  return { counts, loading };
}
