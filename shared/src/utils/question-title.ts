/**
 * Human-readable label for a question, e.g. "Data Structures (CSE), Summer 26, Quiz".
 * Shared by the public questions endpoints and the admin question/submission views.
 */
export const buildQuestionTitle = (q: {
  department: { shortName: string };
  course: { name: string };
  semester: { name: string };
  examType: { name: string };
}) =>
  `${q.course.name} (${q.department.shortName}), ${q.semester.name}, ${q.examType.name}`;
