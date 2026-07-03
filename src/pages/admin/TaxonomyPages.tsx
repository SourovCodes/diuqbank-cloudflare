import {
  coursesApi,
  departmentsApi,
  examTypesApi,
  semestersApi,
} from "../../api";
import { TaxonomyPage, type TaxonomyConfig } from "./TaxonomyPage";

const departmentsConfig: TaxonomyConfig = {
  resource: "departments",
  api: departmentsApi,
  title: "Departments",
  singular: "department",
  fields: [
    { kind: "text", key: "name", label: "Name" },
    { kind: "text", key: "shortName", label: "Short name" },
  ],
};

const coursesConfig: TaxonomyConfig = {
  resource: "courses",
  api: coursesApi,
  title: "Courses",
  singular: "course",
  scopedByDepartment: true,
  fields: [
    { kind: "department", key: "departmentId", label: "Department" },
    { kind: "text", key: "name", label: "Name" },
  ],
};

const semestersConfig: TaxonomyConfig = {
  resource: "semesters",
  api: semestersApi,
  title: "Semesters",
  singular: "semester",
  fields: [{ kind: "text", key: "name", label: "Name" }],
};

const examTypesConfig: TaxonomyConfig = {
  resource: "exam-types",
  api: examTypesApi,
  title: "Exam types",
  singular: "exam type",
  fields: [{ kind: "text", key: "name", label: "Name" }],
};

export function AdminDepartments() {
  return <TaxonomyPage config={departmentsConfig} />;
}
export function AdminCourses() {
  return <TaxonomyPage config={coursesConfig} />;
}
export function AdminSemesters() {
  return <TaxonomyPage config={semestersConfig} />;
}
export function AdminExamTypes() {
  return <TaxonomyPage config={examTypesConfig} />;
}
