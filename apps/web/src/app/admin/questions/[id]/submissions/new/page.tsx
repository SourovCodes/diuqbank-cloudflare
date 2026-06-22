"use client";

import { useParams } from "next/navigation";

import { FormPage } from "@/components/admin/form-page";
import { SubmissionForm } from "@/components/admin/submission-form";

export default function NewSubmissionPage() {
  const params = useParams<{ id: string }>();
  const questionId = Number(params.id);
  const backHref = `/admin/questions/${params.id}/submissions`;

  return (
    <FormPage
      backHref={backHref}
      backLabel="Back to submissions"
      title="New submission"
      description="Upload a PDF submission for this question."
    >
      <SubmissionForm
        submission={null}
        questionId={questionId}
        backHref={backHref}
      />
    </FormPage>
  );
}
