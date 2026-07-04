import type { components } from "./openapi";

export type PaginationMeta = components["schemas"]["PaginationMeta"];
export type FilterOptions = components["schemas"]["FilterOptions"];
export type Question = components["schemas"]["QuestionListItem"];
export type QuestionList = components["schemas"]["QuestionList"];
export type QuestionDetail = components["schemas"]["QuestionDetail"];
export type QuestionSubmissions = components["schemas"]["QuestionSubmissions"];
export type PublicSubmission = components["schemas"]["PublicSubmission"];
export type Contributor = components["schemas"]["Contributor"];
export type ContributorList = components["schemas"]["ContributorList"];
export type ContributorSubmission =
  components["schemas"]["ContributorSubmission"];
export type ContributorSubmissionList =
  components["schemas"]["ContributorSubmissionList"];
export type AuthConfig = components["schemas"]["AuthConfig"];
export type AuthResponse = components["schemas"]["AuthResponse"];
export type User = components["schemas"]["User"];
export type ManualSubmission = components["schemas"]["ManualSubmission"];
export type ManualSubmissionList =
  components["schemas"]["ManualSubmissionList"];
export type AutoSubmission = components["schemas"]["AutoSubmission"];
export type AutoSubmissionList = components["schemas"]["AutoSubmissionList"];

// --- Admin ---
export type AdminManualSubmission =
  components["schemas"]["AdminManualSubmission"];
export type AdminManualSubmissionList =
  components["schemas"]["AdminManualSubmissionList"];
export type AdminAutoSubmission = components["schemas"]["AdminAutoSubmission"];
export type AdminAutoSubmissionList =
  components["schemas"]["AdminAutoSubmissionList"];
export type AdminUser = components["schemas"]["AdminUser"];
export type AdminUserList = components["schemas"]["AdminUserList"];
export type AdminQuestion = components["schemas"]["AdminQuestion"];
export type AdminQuestionList = components["schemas"]["AdminQuestionList"];
export type AdminSubmission = components["schemas"]["AdminSubmission"];
export type AdminSubmissionDetail =
  components["schemas"]["AdminSubmissionDetail"];
export type AdminSubmissionList = components["schemas"]["AdminSubmissionList"];
export type Department = components["schemas"]["Department"];
export type DepartmentList = components["schemas"]["DepartmentList"];
export type Course = components["schemas"]["Course"];
export type CourseList = components["schemas"]["CourseList"];
export type Semester = components["schemas"]["Semester"];
export type SemesterList = components["schemas"]["SemesterList"];
export type ExamType = components["schemas"]["ExamType"];
export type ExamTypeList = components["schemas"]["ExamTypeList"];
export type MergeRequest = components["schemas"]["MergeRequest"];
export type MergeSummary = components["schemas"]["MergeSummary"];

// Admin mutation payloads
export type UpdateManualSubmission =
  components["schemas"]["UpdateManualSubmission"];
export type UpdateAutoSubmission =
  components["schemas"]["UpdateAutoSubmission"];
export type UpdateUser = components["schemas"]["UpdateUser"];
export type CreateDepartment = components["schemas"]["CreateDepartment"];
export type UpdateDepartment = components["schemas"]["UpdateDepartment"];
export type CreateCourse = components["schemas"]["CreateCourse"];
export type UpdateCourse = components["schemas"]["UpdateCourse"];
export type CreateSemester = components["schemas"]["CreateSemester"];
export type UpdateSemester = components["schemas"]["UpdateSemester"];
export type CreateExamType = components["schemas"]["CreateExamType"];
export type UpdateExamType = components["schemas"]["UpdateExamType"];
export type CreateQuestion = components["schemas"]["CreateQuestion"];
export type UpdateQuestion = components["schemas"]["UpdateQuestion"];
export type UpdateSubmission = components["schemas"]["UpdateSubmission"];

export type ManualSubmissionStatus = ManualSubmission["status"];
export type AutoSubmissionStatus = AutoSubmission["status"];
export type UserRole = User["role"];

export type QuestionFilters = {
  page: number;
  perPage: number;
  departmentId: string;
  courseId: string;
  semesterId: string;
  examTypeId: string;
};

export type SelectOption = {
  value: string;
  label: string;
};

export type PaginationParams = {
  page: number;
  perPage: number;
};
