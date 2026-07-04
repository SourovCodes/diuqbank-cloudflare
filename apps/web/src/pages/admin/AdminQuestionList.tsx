import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAdminQuestion, deleteAdminQuestion } from "../../api";
import type { AdminQuestion, SelectOption } from "../../types/api";
import { useAdminQuestions } from "../../hooks/adminQueries";
import { useFilterOptions } from "../../hooks/queries";
import { DataTable, type Column } from "../../components/admin/DataTable";
import {
  BulkBar,
  BulkButton,
  useBulkActions,
} from "../../components/admin/bulk";
import { Pagination } from "../../components/ui/Pagination";
import { Button, labelClass } from "../../components/ui/form";
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
  const navigate = useNavigate();
  const { page, setPage } = usePageParam();
  const [departmentId, setDepartmentId] = useState("");
  const [creating, setCreating] = useState(false);
  const bulk = useBulkActions([["admin", "questions"]]);

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
          <BulkBar bulk={bulk}>
            <BulkButton
              label="Delete"
              bulk={bulk}
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    `Delete ${bulk.selected.size} question(s)? Questions with submissions are skipped with an error.`
                  )
                ) {
                  bulk.run("Delete", deleteAdminQuestion);
                }
              }}
            />
          </BulkBar>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(q) => q.id}
            isLoading={isPending}
            isFetching={isFetching}
            emptyMessage="No questions match this filter."
            onRowClick={(q) => navigate(`/admin/questions/${q.id}`)}
            selection={{
              selected: bulk.selected,
              onChange: bulk.onSelectionChange,
            }}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      {creating && <CreateQuestionModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateQuestionModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();
  const [form, setForm] = useState<QuestionFormValue>(EMPTY_FORM);

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
    mutationFn: () =>
      createAdminQuestion({
        departmentId: Number(form.departmentId),
        courseId: Number(form.courseId),
        semesterId: Number(form.semesterId),
        examTypeId: Number(form.examTypeId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="New question"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={!complete}
            onClick={() => save.mutate()}
          >
            Create
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p className={labelClass}>Department</p>
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
          <p className={labelClass}>Course</p>
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
          <p className={labelClass}>Semester</p>
          <SearchableSelect
            id="q-sem"
            label="Semester"
            options={semesterOptions}
            value={form.semesterId}
            onChange={(v) => setForm((f) => ({ ...f, semesterId: v }))}
          />
        </div>
        <div>
          <p className={labelClass}>Exam type</p>
          <SearchableSelect
            id="q-exam"
            label="Exam type"
            options={examTypeOptions}
            value={form.examTypeId}
            onChange={(v) => setForm((f) => ({ ...f, examTypeId: v }))}
          />
        </div>
        {save.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {(save.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
