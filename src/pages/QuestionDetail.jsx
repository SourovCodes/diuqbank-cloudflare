import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getQuestion, getSubmissions } from "../api";

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function QuestionDetail() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getQuestion(id), getSubmissions(id)])
      .then(([q, s]) => {
        if (!active) return;
        setQuestion(q);
        setSubmissions(s.data);
        setActiveId(s.data[0]?.id ?? null);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <main className="container"><p className="state">Loading…</p></main>;
  if (error)
    return (
      <main className="container">
        <p className="state state-error">Couldn’t load this question: {error}</p>
        <Link to="/questions" className="back-link">← Back to questions</Link>
      </main>
    );

  const active = submissions?.find((s) => s.id === activeId) ?? null;

  return (
    <main className="detail">
      <div className="detail-header">
        <Link to="/questions" className="back-link">← All questions</Link>
        <h1 className="detail-title">{question.course.name}</h1>
        <div className="question-tags">
          <span className="tag">{question.department.shortName}</span>
          <span className="tag">{question.semester.name}</span>
          <span className="tag">{question.examType.name}</span>
        </div>
      </div>

      {submissions.length > 1 && (
        <div className="submission-selector">
          {submissions.map((s) => (
            <button
              key={s.id}
              className={`submission-chip ${s.id === activeId ? "active" : ""}`}
              onClick={() => setActiveId(s.id)}
            >
              <span>{s.contributor?.name ?? "Anonymous"}</span>
              <small>
                {[s.section, s.batch].filter(Boolean).join(" · ")}
                {s.fileSize ? ` · ${formatSize(s.fileSize)}` : ""}
              </small>
            </button>
          ))}
        </div>
      )}

      {!active || !active.pdfUrl ? (
        <p className="state">No PDF available for this question yet.</p>
      ) : (
        <div className="pdf-wrap">
          <div className="pdf-toolbar">
            <span className="pdf-by">
              {active.contributor?.name
                ? `Submitted by ${active.contributor.name}`
                : "Submission"}
              {active.fileSize ? ` · ${formatSize(active.fileSize)}` : ""}
            </span>
            <a
              className="pdf-fallback"
              href={active.pdfUrl}
              target="_blank"
              rel="noopener"
            >
              Open PDF ↗
            </a>
          </div>
          <iframe
            key={active.id}
            className="pdf-frame"
            src={active.pdfUrl}
            title={`${question.course.name} question PDF`}
          />
        </div>
      )}
    </main>
  );
}
