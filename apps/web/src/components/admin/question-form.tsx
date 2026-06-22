"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { EntityPicker } from "@/components/admin/entity-picker";
import { useFilterOptions } from "@/components/admin/use-filter-options";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { type AdminQuestion, questionsClient } from "@/lib/api/admin-client";

/**
 * Create/edit form for a question — its own page (not a dialog), so it has room for the
 * four searchable FK pickers and a cascading department → course relationship. Seeds
 * its state from `question` at mount; the page mounts it fresh per navigation, so no
 * reset effect is needed.
 */
export function QuestionForm({
  question,
  backHref = "/admin/questions",
}: {
  question: AdminQuestion | null;
  backHref?: string;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const options = useFilterOptions();

  const departments = options?.departments ?? [];
  const courses = options?.courses ?? [];
  const semesters = options?.semesters ?? [];
  const examTypes = options?.examTypes ?? [];

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
      router.push(backHref);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
      <div className="grid gap-2">
        <Label htmlFor="department">Department</Label>
        <EntityPicker
          id="department"
          items={departments}
          value={departmentId}
          onChange={(next) => {
            setDepartmentId(next);
            setCourseId("");
          }}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="Select a department"
          searchPlaceholder="Search departments…"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="course">Course</Label>
        <EntityPicker
          id="course"
          items={courseChoices}
          value={courseId}
          onChange={setCourseId}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder={
            departmentId ? "Select a course" : "Select a department first"
          }
          searchPlaceholder="Search courses…"
          disabled={!departmentId}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="semester">Semester</Label>
        <EntityPicker
          id="semester"
          items={semesters}
          value={semesterId}
          onChange={setSemesterId}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="Select a semester"
          searchPlaceholder="Search semesters…"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="examType">Exam type</Label>
        <EntityPicker
          id="examType"
          items={examTypes}
          value={examTypeId}
          onChange={setExamTypeId}
          getId={(item) => item.id}
          getLabel={(item) => item.name}
          placeholder="Select an exam type"
          searchPlaceholder="Search exam types…"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={backHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
