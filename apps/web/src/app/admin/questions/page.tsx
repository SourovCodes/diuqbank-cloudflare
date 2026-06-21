"use client";

import type { FilterOptions } from "@diuqbank/api-client";
import { FileQuestion, FileText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { FormDialog } from "@/components/admin/form-dialog";
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
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { type AdminQuestion, questionsClient } from "@/lib/api/admin-client";

export default function QuestionsPage() {
  const { token } = useAuth();
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

  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Questions"
        description="Each question is a unique department · course · semester · exam-type combination."
      />
      <AdminToolbar
        onNew={() => {
          setEditing(null);
          setOpen(true);
        }}
        newLabel="New question"
      >
        <NativeSelect
          value={departmentId}
          onChange={(event) =>
            setFilters({ departmentId: event.target.value || null, courseId: null })
          }
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.shortName}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={courseId}
          onChange={(event) => setFilter("courseId", event.target.value || null)}
          aria-label="Filter by course"
        >
          <option value="">All courses</option>
          {courseChoices.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={semesterId}
          onChange={(event) => setFilter("semesterId", event.target.value || null)}
          aria-label="Filter by semester"
        >
          <option value="">All semesters</option>
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={examTypeId}
          onChange={(event) => setFilter("examTypeId", event.target.value || null)}
          aria-label="Filter by exam type"
        >
          <option value="">All exam types</option>
          {examTypes.map((examType) => (
            <option key={examType.id} value={examType.id}>
              {examType.name}
            </option>
          ))}
        </NativeSelect>
      </AdminToolbar>
      <ResourceTable<AdminQuestion>
        items={items}
        loading={loading}
        error={error}
        meta={meta}
        currentPage={page}
        rowKey={(item) => item.id}
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
            onEdit={() => {
              setEditing(item);
              setOpen(true);
            }}
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
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit question" : "New question"}
      >
        <QuestionForm
          question={editing}
          departments={departments}
          courses={courses}
          semesters={semesters}
          examTypes={examTypes}
          onDone={() => {
            setOpen(false);
            refetch();
          }}
        />
      </FormDialog>
    </>
  );
}

function QuestionForm({
  question,
  departments,
  courses,
  semesters,
  examTypes,
  onDone,
}: {
  question: AdminQuestion | null;
  departments: FilterOptions["departments"];
  courses: FilterOptions["courses"];
  semesters: FilterOptions["semesters"];
  examTypes: FilterOptions["examTypes"];
  onDone: () => void;
}) {
  const { token } = useAuth();
  const [departmentId, setDepartmentId] = useState(
    question ? String(question.departmentId) : "",
  );
  const [courseId, setCourseId] = useState(
    question ? String(question.courseId) : "",
  );
  const [semesterId, setSemesterId] = useState(
    question ? String(question.semesterId) : "",
  );
  const [examTypeId, setExamTypeId] = useState(
    question ? String(question.examTypeId) : "",
  );
  const [busy, setBusy] = useState(false);

  const courseChoices = departmentId
    ? courses.filter((course) => String(course.departmentId) === departmentId)
    : [];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!departmentId || !courseId || !semesterId || !examTypeId) {
      toast.error("Pick a department, course, semester and exam type");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        departmentId: Number(departmentId),
        courseId: Number(courseId),
        semesterId: Number(semesterId),
        examTypeId: Number(examTypeId),
      };
      if (question) {
        await questionsClient.update(token, question.id, payload);
        toast.success("Question updated");
      } else {
        await questionsClient.create(token, payload);
        toast.success("Question created");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="department">Department</Label>
        <NativeSelect
          id="department"
          value={departmentId}
          onChange={(event) => {
            setDepartmentId(event.target.value);
            setCourseId("");
          }}
          className="w-full"
          required
        >
          <option value="" disabled>
            Select a department
          </option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="course">Course</Label>
        <NativeSelect
          id="course"
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="w-full"
          disabled={!departmentId}
          required
        >
          <option value="" disabled>
            {departmentId ? "Select a course" : "Select a department first"}
          </option>
          {courseChoices.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="semester">Semester</Label>
        <NativeSelect
          id="semester"
          value={semesterId}
          onChange={(event) => setSemesterId(event.target.value)}
          className="w-full"
          required
        >
          <option value="" disabled>
            Select a semester
          </option>
          {semesters.map((semester) => (
            <option key={semester.id} value={semester.id}>
              {semester.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="examType">Exam type</Label>
        <NativeSelect
          id="examType"
          value={examTypeId}
          onChange={(event) => setExamTypeId(event.target.value)}
          className="w-full"
          required
        >
          <option value="" disabled>
            Select an exam type
          </option>
          {examTypes.map((examType) => (
            <option key={examType.id} value={examType.id}>
              {examType.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
