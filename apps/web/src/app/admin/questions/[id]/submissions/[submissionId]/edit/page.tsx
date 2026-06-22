"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FormPage } from "@/components/admin/form-page";
import { SubmissionForm } from "@/components/admin/submission-form";
import { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui/spinner";
import {
  type AdminSubmission,
  submissionsClient,
} from "@/lib/api/admin-client";

export default function EditSubmissionPage() {
  const params = useParams<{ id: string; submissionId: string }>();
  const questionId = Number(params.id);
  const submissionId = Number(params.submissionId);
  const backHref = `/admin/questions/${params.id}/submissions`;
  const { token } = useAuth();

  const [submission, setSubmission] = useState<AdminSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !Number.isFinite(submissionId)) return;
    let active = true;
    submissionsClient
      .get(token, submissionId)
      .then((data) => {
        if (active) setSubmission(data);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });
    return () => {
      active = false;
    };
  }, [token, submissionId]);

  return (
    <FormPage
      backHref={backHref}
      backLabel="Back to submissions"
      title="Edit submission"
      description="Update this submission's contributor and details."
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : submission ? (
        <SubmissionForm
          submission={submission}
          questionId={questionId}
          backHref={backHref}
        />
      ) : (
        <div className="flex justify-center py-8">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      )}
    </FormPage>
  );
}
