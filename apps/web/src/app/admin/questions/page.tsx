"use client";

import { FileQuestion, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { EntityPicker } from "@/components/admin/entity-picker";
import {
  PageHeader,
  ResourceTable,
  RowActions,
} from "@/components/admin/resource-table";
import { useAdminList } from "@/components/admin/use-admin-list";
import { useAdminQueryState } from "@/components/admin/use-admin-query-state";
import { useFilterOptions } from "@/components/admin/use-filter-options";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { type AdminQuestion, questionsClient } from "@/lib/api/admin-client";

export default function QuestionsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const { page, getFilter, setFilter, setFilters } = useAdminQueryState();
  const options = useFilterOptions();

  const departmentId = getFilter("departmentId");
  const courseId = getFilter("courseId");
  const semesterId = getFilter("semesterId");
  const examTypeId = getFilter("examTypeId");

  const departments = options?.departments ?? [];
  const courses = options?.courses ?? [];
  const semesters = options?.semesters ?? [];
  const examTypes = options?.examTypes ?? [];
  const courseChoices = departmentId
    ? courses.filter((course) => String(course.departmentId) === departmentId)
    : courses;

  const { items, meta, loading, error, refetch } = useAdminList(questionsClient, {
    page,
    departmentId: departmentId || undefined,
    courseId: courseId || undefined,
    semesterId: semesterId || undefined,
    examTypeId: examTypeId || undefined,
  });

  const activeFilterCount = [
    departmentId,
    courseId,
    semesterId,
    examTypeId,
  ].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Questions"
        description="Each question is a unique department · course · semester · exam-type combination."
      />
      <AdminToolbar
        onNew={() => router.push("/admin/questions/new")}
        newLabel="New question"
        activeFilterCount={activeFilterCount}
        onClearFilters={() =>
          setFilters({
            departmentId: null,
            courseId: null,
            semesterId: null,
            examTypeId: null,
          })
        }
      >
        <EntityPicker
          items={departments}
          value={departmentId}
          onChange={(next) =>
            setFilters({ departmentId: next || null, courseId: null })
          }
          getId={(item) => item.id}
          getLabel={(item) => item.shortName}
          placeholder="All departments"
          clearLabel="All departments"
          searchPlaceholder="Search departments…"
          aria-label="Filter by department"
          className="w-full sm:w-44"
        />
        <EntityPicker
          items={courseChoices}
          value={courseId}
          onChange={(next) => setFilter("courseId", next || null)}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="All courses"
          clearLabel="All courses"
          searchPlaceholder="Search courses…"
          aria-label="Filter by course"
          className="w-full sm:w-56"
        />
        <EntityPicker
          items={semesters}
          value={semesterId}
          onChange={(next) => setFilter("semesterId", next || null)}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="All semesters"
          clearLabel="All semesters"
          searchPlaceholder="Search semesters…"
          aria-label="Filter by semester"
          className="w-full sm:w-44"
        />
        <EntityPicker
          items={examTypes}
          value={examTypeId}
          onChange={(next) => setFilter("examTypeId", next || null)}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="All exam types"
          clearLabel="All exam types"
          searchPlaceholder="Search exam types…"
          aria-label="Filter by exam type"
          className="w-full sm:w-44"
        />
      </AdminToolbar>
      <ResourceTable<AdminQuestion>
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        currentPage={page}
        rowKey={(item) => item.id}
        onRowClick={(item) => router.push(`/admin/questions/${item.id}/edit`)}
        columns={[
          {
            header: "Question",
            cell: (item) => <span className="font-medium">{item.title}</span>,
          },
          {
            header: "Submissions",
            className: "w-40",
            cell: (item) => (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/questions/${item.id}/submissions`}>
                  <FileText className="size-4" />
                  {item.submissionCount}
                </Link>
              </Button>
            ),
          },
        ]}
        actions={(item) => (
          <RowActions
            onEdit={() => router.push(`/admin/questions/${item.id}/edit`)}
            onDelete={() => questionsClient.remove(token!, item.id)}
            onDeleted={refetch}
            deleteTitle="Delete this question?"
            deleteDescription="Questions that already have submissions cannot be deleted."
          />
        )}
        emptyIcon={FileQuestion}
        emptyTitle="No questions"
        emptyDescription="Create your first question to start collecting submissions."
      />
    </>
  );
}
