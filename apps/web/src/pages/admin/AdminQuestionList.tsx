import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAdminQuestion,
  deleteAdminQuestion,
  updateAdminQuestion,
} from "../../api";
import type { AdminQuestion, SelectOption } from "../../types/api";
import { useAdminQuestions } from "../../hooks/adminQueries";
import { useFilterOptions } from "../../hooks/queries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/form";
import { Modal } from "../../components/ui/Modal";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { AdminHeader, ErrorBox, usePageParam } from "./shared";

type QuestionFormValue = {
  departmentId: string;
  courseId: string;
  semesterId: string;
  examTypeId: string;
};

const EMPTY_FORM: QuestionFormValue = {
  departmentId: "",
  courseId: "",
  semesterId: "",
  examTypeId: "",
};

export default function AdminQuestionList() {
  const { page, setPage } = usePageParam();
  const [departmentId, setDepartmentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminQuestion | null>(null);

  useEffect(() => {
    document.title = "Questions | Admin";
  }, []);

  const { data, isPending, isError, error, isFetching } = useAdminQuestions({
    page,
    perPage: 20,
    departmentId: departmentId ? Number(departmentId) : undefined,
  });
  const { data: options } = useFilterOptions();

  const departmentOptions: SelectOption[] = useMemo(
    () =>
      (options?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: `${d.name} (${d.shortName})`,
      })),
    [options]
  );

  const columns: Column<AdminQuestion>[] = [
    {
      header: "Question",
      cell: (q) => (
        <p className="font-medium text-gray-900 dark:text-gray-100">{q.title}</p>
      ),
    },
    {
      header: "Department",
      cell: (q) => (
        <span className="text-gray-600 dark:text-gray-300">
          {q.department.shortName}
        </span>
      ),
    },
    {
      header: "Course",
      cell: (q) => (
        <span className="text-gray-600 dark:text-gray-300">{q.course.name}</span>
      ),
    },
    {
      header: "Semester",
      cell: (q) => (
        <span className="text-gray-600 dark:text-gray-300">
          {q.semester.name}
        </span>
      ),
    },
    {
      header: "Exam",
      cell: (q) => (
        <span className="text-gray-600 dark:text-gray-300">
          {q.examType.name}
        </span>
      ),
    },
    {
      header: "Subs",
      cell: (q) => <span className="tabular-nums">{q.submissionCount}</span>,
      className: "text-right",
    },
    {
      header: "Views",
      cell: (q) => <span className="tabular-nums">{q.viewCount}</span>,
      className: "text-right",
    },
    {
      header: "",
      cell: (q) => (
        <button
          type="button"
          onClick={() => setEditing(q)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Edit
        </button>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Questions"
        description={data?.meta.total ? `${data.meta.total} questions.` : undefined}
        actions={
          <>
            <div className="w-56">
              <SearchableSelect
                id="question-dept-filter"
                label="Department"
                options={departmentOptions}
                value={departmentId}
                onChange={(v) => {
                  setDepartmentId(v);
                  setPage(1);
                }}
                placeholder="All departments"
              />
            </div>
            <Button onClick={() => setCreating(true)}>New question</Button>
          </>
        }
      />

      {isError ? (
        <ErrorBox message={`Failed to load questions: ${error.message}`} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(q) => q.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No questions match this filter."
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      {creating && (
        <QuestionModal mode="create" onClose={() => setCreating(false)} />
      )}
      {editing && (
        <QuestionModal
          mode="edit"
          question={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function QuestionModal({
  mode,
  question,
  onClose,
}: {
  mode: "create" | "edit";
  question?: AdminQuestion;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();
  const [form, setForm] = useState<QuestionFormValue>(
    question
      ? {
          departmentId: String(question.departmentId),
          courseId: String(question.courseId),
          semesterId: String(question.semesterId),
          examTypeId: String(question.examTypeId),
        }
      : EMPTY_FORM
  );

  const departmentOptions: SelectOption[] = (options?.departments ?? []).map(
    (d) => ({ value: String(d.id), label: `${d.name} (${d.shortName})` })
  );
  // Courses are scoped to the chosen department.
  const courseOptions: SelectOption[] = (options?.courses ?? [])
    .filter((c) => String(c.departmentId) === form.departmentId)
    .map((c) => ({ value: String(c.id), label: c.name }));
  const semesterOptions: SelectOption[] = (options?.semesters ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));
  const examTypeOptions: SelectOption[] = (options?.examTypes ?? []).map((e) => ({
    value: String(e.id),
    label: e.name,
  }));

  const complete =
    form.departmentId && form.courseId && form.semesterId && form.examTypeId;

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        departmentId: Number(form.departmentId),
        courseId: Number(form.courseId),
        semesterId: Number(form.semesterId),
        examTypeId: Number(form.examTypeId),
      };
      return mode === "create"
        ? createAdminQuestion(payload)
        : updateAdminQuestion(question!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteAdminQuestion(question!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "New question" : "Edit question"}
      footer={
        <>
          {mode === "edit" && (
            <Button
              variant="danger"
              className="mr-auto"
              loading={remove.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Delete this question? Its submissions must be reassigned or removed first."
                  )
                ) {
                  remove.mutate();
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={!complete}
            onClick={() => save.mutate()}
          >
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p id="q-dept-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Department
          </p>
          <SearchableSelect
            id="q-dept"
            label="Department"
            options={departmentOptions}
            value={form.departmentId}
            onChange={(v) =>
              setForm((f) => ({ ...f, departmentId: v, courseId: "" }))
            }
          />
        </div>
        <div>
          <p id="q-course-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Course
          </p>
          <SearchableSelect
            id="q-course"
            label="Course"
            options={courseOptions}
            value={form.courseId}
            onChange={(v) => setForm((f) => ({ ...f, courseId: v }))}
            disabled={!form.departmentId}
            placeholder={
              form.departmentId ? "Select…" : "Choose a department first"
            }
          />
        </div>
        <div>
          <p id="q-sem-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Semester
          </p>
          <SearchableSelect
            id="q-sem"
            label="Semester"
            options={semesterOptions}
            value={form.semesterId}
            onChange={(v) => setForm((f) => ({ ...f, semesterId: v }))}
          />
        </div>
        <div>
          <p id="q-exam-label" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Exam type
          </p>
          <SearchableSelect
            id="q-exam"
            label="Exam type"
            options={examTypeOptions}
            value={form.examTypeId}
            onChange={(v) => setForm((f) => ({ ...f, examTypeId: v }))}
          />
        </div>
        {(save.isError || remove.isError) && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {((save.error || remove.error) as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
