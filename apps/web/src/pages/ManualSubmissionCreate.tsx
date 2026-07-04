import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManualSubmission } from "../api";
import { useFilterOptions } from "../hooks/queries";
import { Button, Field, inputClass } from "../components/ui/form";
import { Card, CardTitle } from "../components/ui/Card";
import { CreatableSelect } from "../components/ui/CreatableSelect";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { FileUpload } from "../components/ui/FileUpload";

export default function ManualSubmissionCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();

  const [departmentName, setDepartmentName] = useState("");
  const [departmentShortName, setDepartmentShortName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [semesterName, setSemesterName] = useState("");
  const [examTypeName, setExamTypeName] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    document.title = "New submission | DIUQBank";
  }, []);

  // When the typed department isn't in the catalogue we ask for its short name;
  // otherwise we derive it and scope the course list to that department.
  const matchedDept = options?.departments.find(
    (d) => d.name.trim().toLowerCase() === departmentName.trim().toLowerCase()
  );
  const isCustomDept = departmentName.trim() !== "" && !matchedDept;
  const visibleCourses = matchedDept
    ? (options?.courses.filter((c) => c.departmentId === matchedDept.id) ?? [])
    : [];
  const deptShortName = matchedDept?.shortName ?? departmentShortName.trim();

  const isValid =
    !!file &&
    !!departmentName.trim() &&
    (!isCustomDept || !!departmentShortName.trim()) &&
    !!courseName.trim() &&
    !!semesterName.trim() &&
    !!examTypeName;

  const create = useMutation({
    mutationFn: (form: FormData) => createManualSubmission(form),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["manual-submissions"] });
      navigate(`/submissions/manual/${submission.id}`, { replace: true });
    },
  });

  function handleDeptChange(name: string) {
    setDepartmentName(name);
    setDepartmentShortName("");
    setCourseName("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid || !file) return;
    const form = new FormData();
    form.set("pdf", file);
    form.set("departmentName", departmentName.trim());
    form.set("departmentShortName", deptShortName);
    form.set("courseName", courseName.trim());
    form.set("semesterName", semesterName.trim());
    form.set("examTypeName", examTypeName);
    if (note.trim()) form.set("note", note.trim());
    create.mutate(form);
  }

  return (
    <div>
      <Link
        to="/submissions/manual"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to submissions
      </Link>

      <div className="mb-7 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          New manual submission
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Upload the question paper and tell us where it belongs. A reviewer
          will publish it once approved.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Card className="space-y-4 p-6">
          <CardTitle>Question details</CardTitle>

          <Field label="Department" htmlFor="departmentName">
            <CreatableSelect
              id="departmentName"
              options={
                options?.departments.map((d) => ({
                  value: d.name,
                  label: `${d.name} (${d.shortName})`,
                })) ?? []
              }
              value={departmentName}
              onChange={handleDeptChange}
              placeholder="Select or type a department"
            />
          </Field>

          {isCustomDept && (
            <Field
              label="Department short name"
              htmlFor="departmentShortName"
              hint="This department is new — give its abbreviation."
            >
              <input
                id="departmentShortName"
                className={inputClass}
                value={departmentShortName}
                onChange={(e) => setDepartmentShortName(e.target.value)}
                placeholder="e.g. CSE"
              />
            </Field>
          )}

          <Field label="Course" htmlFor="courseName">
            <CreatableSelect
              id="courseName"
              options={visibleCourses.map((c) => ({ value: c.name, label: c.name }))}
              value={courseName}
              onChange={setCourseName}
              placeholder={
                departmentName.trim() ? "Select or type a course" : "Select a department first"
              }
              disabled={!departmentName.trim()}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Semester" htmlFor="semesterName">
              <CreatableSelect
                id="semesterName"
                options={options?.semesters.map((s) => ({ value: s.name, label: s.name })) ?? []}
                value={semesterName}
                onChange={setSemesterName}
                placeholder="Select or type a semester"
              />
            </Field>
            <Field label="Exam type" htmlFor="examType">
              <SearchableSelect
                id="examType"
                label="Exam type"
                options={ALLOWED_EXAM_TYPES.map((t) => ({ value: t, label: t }))}
                value={examTypeName}
                onChange={setExamTypeName}
                placeholder="Select type"
              />
            </Field>
          </div>

          <Field label="Note (optional)" htmlFor="note">
            <textarea
              id="note"
              className={inputClass}
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the reviewer should know."
            />
          </Field>
        </Card>

        <Card className="p-6">
          <CardTitle>Question paper (PDF)</CardTitle>
          <div className="mt-4">
            <FileUpload file={file} onChange={setFile} disabled={create.isPending} />
          </div>
        </Card>

        {create.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {(create.error as Error).message}
          </p>
        )}

        <Button type="submit" className="w-full" loading={create.isPending} disabled={!isValid}>
          Submit for review
        </Button>
      </form>
    </div>
  );
}
