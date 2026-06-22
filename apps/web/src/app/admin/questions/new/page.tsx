"use client";

import { FormPage } from "@/components/admin/form-page";
import { QuestionForm } from "@/components/admin/question-form";

export default function NewQuestionPage() {
  return (
    <FormPage
      backHref="/admin/questions"
      backLabel="Back to questions"
      title="New question"
      description="Each question is a unique department · course · semester · exam-type combination."
    >
      <QuestionForm question={null} />
    </FormPage>
  );
}
