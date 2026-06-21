"use client";

import { FileText } from "lucide-react";

import { NameResourcePage } from "@/components/admin/name-resource-page";
import { examTypesClient } from "@/lib/api/admin-client";

export default function ExamTypesPage() {
  return (
    <NameResourcePage
      client={examTypesClient}
      title="Exam Types"
      description="Kinds of exam a question can belong to, e.g. “Midterm”, “Final”."
      singular="exam type"
      emptyIcon={FileText}
      placeholder="Midterm"
      deleteDescription="Exam types referenced by questions cannot be deleted."
    />
  );
}
