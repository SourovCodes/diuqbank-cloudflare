import { useState } from "react";
import { Link, NavLink, Outlet, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import QuestionList from "./pages/QuestionList";
import QuestionDetail from "./pages/QuestionDetail";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Questions", to: "/questions" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo" onClick={close}>
          DIUQBank
        </Link>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end onClick={close}>
              {link.label}
            </NavLink>
          ))}
          <Link to="/questions" className="nav-cta" onClick={close}>
            Browse Questions
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-inner">
        <span className="footer-logo">DIUQBank</span>
        <nav className="footer-links">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="footer-copy">
          © {new Date().getFullYear()} DIUQBank. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

function Layout() {
  return (
    <div className="page">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/questions" element={<QuestionList />} />
        <Route path="/questions/:id" element={<QuestionDetail />} />
      </Route>
    </Routes>
  );
}
