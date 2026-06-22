"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { FormPage } from "@/components/admin/form-page";
import { QuestionForm } from "@/components/admin/question-form";
import { useAuth } from "@/components/auth-provider";
import { Spinner } from "@/components/ui/spinner";
import { type AdminQuestion, questionsClient } from "@/lib/api/admin-client";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const questionId = Number(params.id);
  const { token } = useAuth();

  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !Number.isFinite(questionId)) return;
    let active = true;
    questionsClient
      .get(token, questionId)
      .then((data) => {
        if (active) setQuestion(data);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      });
    return () => {
      active = false;
    };
  }, [token, questionId]);

  return (
    <FormPage
      backHref="/admin/questions"
      backLabel="Back to questions"
      title="Edit question"
      description={question ? question.title : undefined}
    >
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : question ? (
        <QuestionForm question={question} />
      ) : (
        <div className="flex justify-center py-8">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      )}
    </FormPage>
  );
}
