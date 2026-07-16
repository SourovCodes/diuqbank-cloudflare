import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManualSubmission } from "../api";
import { useFilterOptions } from "../hooks/queries";
import { Button, Field, inputClass } from "../components/ui/form";
import { Card, CardTitle } from "../components/ui/Card";
import { CreatableSelect } from "../components/ui/CreatableSelect";
import { FileUpload } from "../components/ui/FileUpload";
import type { SelectOption } from "../types/api";

export default function SubmissionCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();

  const [file, setFile] = useState<File | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [semesterName, setSemesterName] = useState("");
  const [examTypeName, setExamTypeName] = useState("");
  const [section, setSection] = useState("");
  const [batch, setBatch] = useState("");

  useEffect(() => {
    document.title = "Upload a question | DIUQBank";
  }, []);

  const departmentOptions: SelectOption[] = useMemo(
    () =>
      (options?.departments ?? []).map((d) => ({
        value: d.name,
        label: `${d.name} (${d.shortName})`,
      })),
    [options]
  );

  // Course suggestions are scoped to the department: only offered once the
  // typed department matches an existing one (a brand-new department can't
  // have existing courses).
  const courseOptions: SelectOption[] = useMemo(() => {
    const department = (options?.departments ?? []).find(
      (d) => d.name.toLowerCase() === departmentName.trim().toLowerCase()
    );
    if (!department) return [];
    return (options?.courses ?? [])
      .filter((c) => c.departmentId === department.id)
      .map((c) => ({ value: c.name, label: c.name }));
  }, [options, departmentName]);

  const semesterOptions: SelectOption[] = useMemo(
    () =>
      (options?.semesters ?? []).map((s) => ({ value: s.name, label: s.name })),
    [options]
  );

  const create = useMutation({
    mutationFn: (form: FormData) => createManualSubmission(form),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["manual-submissions"] });
      navigate(`/submissions/${submission.id}`, { replace: true });
    },
  });

  const complete =
    !!file &&
    !!departmentName.trim() &&
    !!courseName.trim() &&
    !!semesterName.trim() &&
    !!examTypeName;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!complete || !file) return;
    const form = new FormData();
    form.set("pdf", file);
    form.set("departmentName", departmentName.trim());
    form.set("courseName", courseName.trim());
    form.set("semesterName", semesterName.trim());
    form.set("examTypeName", examTypeName);
    if (section.trim()) form.set("section", section.trim());
    if (batch.trim()) form.set("batch", batch.trim());
    create.mutate(form);
  }

  return (
    <div>
      <Link
        to="/submissions"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to submissions
      </Link>

      <div className="mb-7 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          Upload a question paper
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Upload the PDF and fill in its details. A reviewer checks every
          upload before it goes live. Picking existing values from the
          suggestions speeds up approval — you can type new ones, but a
          reviewer has to add them first.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Card className="p-6">
          <CardTitle>Question paper (PDF)</CardTitle>
          <div className="mt-4">
            <FileUpload file={file} onChange={setFile} disabled={create.isPending} />
          </div>
        </Card>

        <Card className="p-6">
          <CardTitle>Paper details</CardTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Department" htmlFor="departmentName">
              <CreatableSelect
                id="departmentName"
                options={departmentOptions}
                value={departmentName}
                onChange={(next) => {
                  setDepartmentName(next);
                  // A different department invalidates the course suggestions.
                  setCourseName("");
                }}
                placeholder="Select or type a department…"
                disabled={create.isPending}
              />
            </Field>
            <Field label="Course" htmlFor="courseName">
              <CreatableSelect
                id="courseName"
                options={courseOptions}
                value={courseName}
                onChange={setCourseName}
                placeholder="Select or type a course…"
                disabled={create.isPending}
              />
            </Field>
            <Field label="Semester" htmlFor="semesterName">
              <CreatableSelect
                id="semesterName"
                options={semesterOptions}
                value={semesterName}
                onChange={setSemesterName}
                placeholder="e.g. Spring 25"
                disabled={create.isPending}
              />
            </Field>
            <Field label="Exam type" htmlFor="examTypeName">
              <select
                id="examTypeName"
                value={examTypeName}
                onChange={(e) => setExamTypeName(e.target.value)}
                className={inputClass}
                disabled={create.isPending}
              >
                <option value="">Select exam type…</option>
                {ALLOWED_EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Section (optional)" htmlFor="section">
              <input
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                maxLength={100}
                className={inputClass}
                disabled={create.isPending}
              />
            </Field>
            <Field label="Batch (optional)" htmlFor="batch">
              <input
                id="batch"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                maxLength={100}
                className={inputClass}
                disabled={create.isPending}
              />
            </Field>
          </div>
        </Card>

        {create.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {(create.error as Error).message}
          </p>
        )}

        <Button type="submit" className="w-full" loading={create.isPending} disabled={!complete}>
          Submit for review
        </Button>
      </form>
    </div>
  );
}
