"use client";

import { CalendarDays } from "lucide-react";

import { NameResourcePage } from "@/components/admin/name-resource-page";
import { semestersClient } from "@/lib/api/admin-client";

export default function SemestersPage() {
  return (
    <NameResourcePage
      client={semestersClient}
      title="Semesters"
      description="Academic terms questions are tagged with, e.g. “Summer 2026”."
      singular="semester"
      emptyIcon={CalendarDays}
      placeholder="Summer 2026"
      deleteDescription="Semesters referenced by questions cannot be deleted."
    />
  );
}
