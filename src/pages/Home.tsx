import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContributors, useFilterOptions, useQuestions } from "../hooks/queries";
import { Card } from "../components/ui/Card";

const EMPTY_FILTERS = {
  page: 1,
  perPage: 1,
  departmentId: "",
  courseId: "",
  semesterId: "",
  examTypeId: "",
};

function formatCount(n?: number): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export default function Home() {
  const { data: options } = useFilterOptions();
  const { data: questions } = useQuestions(EMPTY_FILTERS);
  const { data: contributors } = useContributors({ page: 1, perPage: 1 });

  useEffect(() => {
    document.title = "DIUQBank";
  }, []);

  const stats = [
    { label: "Questions", value: formatCount(questions?.meta.total) },
    { label: "Departments", value: formatCount(options?.departments.length) },
    { label: "Courses", value: formatCount(options?.courses.length) },
    { label: "Contributors", value: formatCount(contributors?.meta.total) },
  ];

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="container mx-auto flex flex-col items-center px-4 py-20 text-center sm:py-24">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Welcome
        </p>
        <h1 className="max-w-[16ch] text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Past questions, one PDF away.
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg text-gray-500 dark:text-gray-400">
          Browse the DIUQBank question archive by department, semester, and exam
          type — then read the paper right in your browser.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3.5">
          <Link
            to="/questions"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Browse Questions
          </Link>
          <Link
            to="/submissions/manual/new"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
          >
            Contribute a paper
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="container mx-auto px-4 pb-4">
        <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-5 text-center sm:p-6">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {stat.label}
              </dt>
              <dd className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                {stat.value}
              </dd>
            </Card>
          ))}
        </dl>
      </section>

      {/* Ways to contribute */}
      <section className="container mx-auto px-4 py-14">
        <div className="mb-7 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Two ways to contribute
          </h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-6 text-gray-500 dark:text-gray-400">
            Add a paper to the archive in whichever way suits you. Both start
            with a single PDF.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ContributeCard
            to="/submissions/auto/new"
            badge="Fastest"
            title="AI-assisted upload"
            description="Drop in a PDF and let the AI read it — it fills in the department, course, semester, and exam type for you."
            cta="Upload a PDF"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z"
              />
            }
          />
          <ContributeCard
            to="/submissions/manual/new"
            badge="Full control"
            title="Manual submission"
            description="Prefer to enter the details yourself? Fill in the department, course, semester, and exam type, then send it for review."
            cta="Fill in the details"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 16l-4 1 1-4 9.5-9.5Z"
              />
            }
          />
        </div>
      </section>

      {/* Features */}
      <section
        id="about"
        className="border-t border-gray-200 bg-gray-50 py-14 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="container mx-auto px-4">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Search by the way students remember papers.
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
              DIUQBank keeps the public archive focused on the essentials:
              department, course, semester, exam type, contributors, and the PDF
              itself.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              title="Fast filters"
              body="Searchable selects stay usable as the archive grows."
            />
            <Feature
              title="Direct reading"
              body="Question PDFs open inline with full contributor context."
            />
            <Feature
              title="Community sourced"
              body="Every paper is contributed and credited to a real student."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

type ContributeCardProps = {
  to: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  icon: ReactNode;
};

function ContributeCard({ to, badge, title, description, cta, icon }: ContributeCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-lg border border-gray-200 bg-white p-6 transition hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500 dark:hover:bg-blue-500/5"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {icon}
          </svg>
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {badge}
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </p>
      <span className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
        {cta} →
      </span>
    </Link>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {body}
      </p>
    </Card>
  );
}
