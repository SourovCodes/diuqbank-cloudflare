import { useState } from "react";
import "./App.css";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav">
      <div className="nav-inner">
        <a href="#home" className="nav-logo" onClick={close}>
          DIUQBank
        </a>

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
            <a key={link.href} href={link.href} onClick={close}>
              {link.label}
            </a>
          ))}
          <a href="#contact" className="nav-cta" onClick={close}>
            Get Started
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <main id="home" className="hero">
      <p className="hero-eyebrow">Welcome</p>
      <h1>Build something clean and simple.</h1>
      <p className="hero-sub">
        A minimal, mobile-responsive starting point for your next project. No
        clutter — just the essentials, ready to grow.
      </p>
      <div className="hero-actions">
        <a href="#features" className="btn btn-primary">
          Get Started
        </a>
        <a href="#about" className="btn btn-ghost">
          Learn More
        </a>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-inner">
        <span className="footer-logo">DIUQBank</span>
        <nav className="footer-links">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <span className="footer-copy">
          © {new Date().getFullYear()} DIUQBank. All rights reserved.
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="page">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}
