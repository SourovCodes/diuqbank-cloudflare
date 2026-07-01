import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFilterOptions, getQuestions } from "../api";

const emptyFilters = {
  departmentId: "",
  courseId: "",
  semesterId: "",
  examTypeId: "",
};

export default function QuestionList() {
  const [options, setOptions] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getFilterOptions().then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getQuestions({ ...filters, page, perPage: 20 })
      .then((r) => active && setResult(r))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters, page]);

  function setFilter(key, value) {
    setPage(1);
    setFilters((f) => {
      const next = { ...f, [key]: value };
      // clearing/changing department invalidates the chosen course
      if (key === "departmentId") next.courseId = "";
      return next;
    });
  }

  const courses =
    options?.courses.filter(
      (c) => String(c.departmentId) === String(filters.departmentId)
    ) ?? [];

  const meta = result?.meta;

  return (
    <main className="container">
      <h1 className="page-title">Questions</h1>

      <div className="filter-bar">
        <select
          value={filters.departmentId}
          onChange={(e) => setFilter("departmentId", e.target.value)}
        >
          <option value="">All departments</option>
          {options?.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={filters.courseId}
          disabled={!filters.departmentId}
          onChange={(e) => setFilter("courseId", e.target.value)}
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filters.semesterId}
          onChange={(e) => setFilter("semesterId", e.target.value)}
        >
          <option value="">All semesters</option>
          {options?.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filters.examTypeId}
          onChange={(e) => setFilter("examTypeId", e.target.value)}
        >
          <option value="">All exam types</option>
          {options?.examTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="state state-error">Couldn’t load questions: {error}</p>}
      {loading && <p className="state">Loading…</p>}
      {!loading && !error && result?.data.length === 0 && (
        <p className="state">No questions match these filters.</p>
      )}

      {!loading && !error && result?.data.length > 0 && (
        <div className="question-grid">
          {result.data.map((q) => (
            <Link key={q.id} to={`/questions/${q.id}`} className="question-card">
              <h2 className="question-course">{q.course.name}</h2>
              <div className="question-tags">
                <span className="tag">{q.department.shortName}</span>
                <span className="tag">{q.semester.name}</span>
                <span className="tag">{q.examType.name}</span>
              </div>
              <span className="question-count">
                {q.submissionCount} submission{q.submissionCount === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={meta.page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            disabled={meta.page >= meta.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
