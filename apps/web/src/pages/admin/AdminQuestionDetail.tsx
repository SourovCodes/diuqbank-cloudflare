import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAdminQuestion, updateAdminQuestion } from "../../api";
import type { AdminQuestion, SelectOption } from "../../types/api";
import { useAdminQuestion } from "../../hooks/adminQueries";
import { useFilterOptions } from "../../hooks/queries";
import { Button, labelClass } from "../../components/ui/form";
import { SearchableSelect } from "../../components/ui/SearchableSelect";
import { ErrorBox } from "./shared";
import { SubmissionsTable } from "./SubmissionsTable";

export default function AdminQuestionDetail() {
  const { id } = useParams();
  const { data: question, isPending, isError } = useAdminQuestion(id);

  useEffect(() => {
    document.title = question
      ? `${question.title} | Admin`
      : "Question | Admin";
  }, [question]);

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Loading question…
      </div>
    );
  }

  if (isError || !question) {
    return <ErrorBox message="Question not found — it may have been deleted." />;
  }

  return (
    <div>
      <Link
        to="/admin/questions"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        ← Back to questions
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {question.title}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {question.submissionCount} submission
            {question.submissionCount === 1 ? "" : "s"} · {question.viewCount}{" "}
            view{question.viewCount === 1 ? "" : "s"} ·{" "}
            <Link
              to={`/questions/${question.id}`}
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              view public page
            </Link>
          </p>
        </div>
      </div>

      {/* Keyed so the form re-seeds when navigating between questions. */}
      <EditCard key={question.id} question={question} />

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Submissions
      </h2>
      <SubmissionsTable questionId={question.id} />
    </div>
  );
}

function EditCard({ question }: { question: AdminQuestion }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();
  const [form, setForm] = useState({
    departmentId: String(question.departmentId),
    courseId: String(question.courseId),
    semesterId: String(question.semesterId),
    examTypeId: String(question.examTypeId),
  });

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

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "question", String(question.id)],
    });
  }

  const save = useMutation({
    mutationFn: () =>
      updateAdminQuestion(question.id, {
        departmentId: Number(form.departmentId),
        courseId: Number(form.courseId),
        semesterId: Number(form.semesterId),
        examTypeId: Number(form.examTypeId),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => deleteAdminQuestion(question.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      navigate("/admin/questions");
    },
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Taxonomy
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          loading={save.isPending}
          disabled={!complete}
          onClick={() => save.mutate()}
        >
          Save changes
        </Button>
        <Button
          variant="danger"
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
          Delete question
        </Button>
        {save.isSuccess && !save.isPending && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved.
          </span>
        )}
      </div>
      {(save.isError || remove.isError) && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {((save.error || remove.error) as Error).message}
        </p>
      )}
    </div>
  );
}
