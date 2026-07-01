import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main id="home" className="hero">
      <p className="hero-eyebrow">Welcome</p>
      <h1>Past questions, one PDF away.</h1>
      <p className="hero-sub">
        Browse the DIUQBank question archive by department, semester, and exam
        type — then read the paper right in your browser.
      </p>
      <div className="hero-actions">
        <Link to="/questions" className="btn btn-primary">
          Browse Questions
        </Link>
        <a href="#about" className="btn btn-ghost">
          Learn More
        </a>
      </div>
    </main>
  );
}
