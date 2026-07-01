import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function Home() {
  useEffect(() => {
    document.title = "DIUQBank";
  }, []);

  return (
    <main className="flex-1">
      <section className="container mx-auto flex flex-col items-center px-4 py-20 text-center sm:py-28">
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

      <section
        id="about"
        className="border-t border-gray-200 bg-gray-50 py-14 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-start">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Search by the way students remember papers.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
              DIUQBank keeps the public archive focused on the essentials:
              department, course, semester, exam type, contributors, and the
              PDF itself.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                Fast filters
              </dt>
              <dd className="mt-1 text-gray-500 dark:text-gray-400">
                Searchable selects stay usable as the archive grows.
              </dd>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              <dt className="font-semibold text-gray-900 dark:text-gray-100">
                Direct reading
              </dt>
              <dd className="mt-1 text-gray-500 dark:text-gray-400">
                Question PDFs open inline with contributor context.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
