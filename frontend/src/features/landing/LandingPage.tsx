"use client";

import { useEffect, useState } from "react";
import { recordVisit } from "./visit";
import {
  Play,
  ArrowRight,
  ArrowUpRight,
  Check,
  CalendarDays,
  Download,
  GitBranch,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import ProductDemo from "./ProductDemo";
import WorkflowRail from "./WorkflowRail";
import FeatureTour from "./FeatureTour";
import ProductSimulations from "./ProductSimulations";
import {
  MotionProvider,
  MotionControl,
  ScrollMotion,
  ScenicSurface,
  SmoothDisclosure,
  usePageMotion,
} from "./PageMotion";
import "./landing.css";
import "./demo.css";
import "./continuity.css";
import "./simulations.css";

const BOOKING_URL = "https://calendly.com/samarpanmohanty3347/30min";
const questions = [
  {
    title: "Is ProtectSUS really free?",
    answer: "Yes. ProtectSUS is free, with no subscription or payment card required. You can connect one active repository per account. Shared review capacity and usage limits apply. Feedback is optional; no promotion or public review is required.",
  },
  {
    title: "What does ProtectSUS monitor?",
    answer:
      "ProtectSUS indexes connected GitHub repositories, identifies supported API usage, and monitors linked documentation and API specifications. Pushes and pull requests can trigger new assessments. Dynamic usage and incomplete coverage are reported explicitly.",
  },
  {
    title: "Does it change or merge my code automatically?",
    answer:
      "Manual review is the default. You can choose to prepare proposals or open verified draft pull requests for supported changes. Verification gates still apply, and ProtectSUS does not automatically merge pull requests.",
  },
  {
    title: "What does a verified patch mean?",
    answer:
      "For supported API contract migrations, ProtectSUS runs isolated checks against the precise patch and records the results. Contract replay is not a live-provider test or a guarantee of production correctness. The workspace shows what was checked and what still needs your review.",
  },
  {
    title: "How does security review work?",
    answer:
      "The maintenance workspace checks supported Python and JavaScript/TypeScript patterns, such as disabled TLS verification and dynamic shell execution. These are potential risks for you to review, not proof of an exploit or a complete security audit.",
  },
  {
    title: "What access do I need to get started?",
    answer:
      "Download ProtectSUS for macOS or Windows, then sign in with GitHub in the desktop app. Install the ProtectSUS GitHub App on the repositories you want to connect. Repository access is checked before connecting. Initial indexing reads source without executing repository code.",
  },
  {
    title: "Can I control automation and model spending?",
    answer:
      "Yes. Workspace settings include monitoring controls, automation modes, and limits for paid model work. Model calls require separate consent. You can pause monitoring and review the status of queued or running tasks.",
  },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className="ps-brand" href="#top" aria-label="ProtectSUS home">
      <img src="/logo-white.svg" width="22" height="29" alt="" />
      <span>ProtectSUS</span>
      {footer && <span className="ps-brand-caption">Keep building.</span>}
    </a>
  );
}
function DownloadLink({
  compact = false,
  secondary = false,
}: {
  compact?: boolean;
  secondary?: boolean;
}) {
  return (
    <a
      className={`ps-button ${secondary ? "ps-button-secondary" : "ps-button-primary"}${compact ? " ps-button-compact" : ""}`}
      href="/download"
    >
      {compact ? "Desktop app" : "Download desktop app"}
      <Download size={16} aria-hidden="true" />
    </a>
  );
}
const APP_URL = "https://protectsus.app/maintenance/home";
function AppLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`ps-button ps-button-secondary${compact ? " ps-button-compact" : ""}`}
      href={APP_URL}
    >
      {compact ? "Web app" : "Open web app"}
      <ArrowUpRight size={16} aria-hidden="true" />
    </a>
  );
}
function MeetingLink() {
  return (
    <a
      className="ps-button ps-button-secondary"
      href={BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <CalendarDays size={16} aria-hidden="true" />
      Book a meeting
    </a>
  );
}

function LandingContent() {
  const { paused, reduced } = usePageMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playRequest, setPlayRequest] = useState(0);
  useEffect(() => recordVisit("landing"), []);
  const links = [
    { href: "#product", title: "Product" },
    { href: "#security", title: "Security" },
    { href: "#questions", title: "FAQ" },
    { href: "#contact", title: "Contact" },
  ];
  return (
    <div
      className="ps-landing"
      id="top"
      data-motion={paused ? "paused" : "running"}
      data-reduced={reduced}
    >
      <ScrollMotion />
      <MotionControl />
      <div className="ps-reading-progress" aria-hidden="true" />
      <a className="ps-skip" href="#main">
        Skip to content
      </a>
      <header
        className="ps-header"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMenuOpen(false);
            document.getElementById("ps-menu-toggle")?.focus();
          }
        }}
      >
        <div className="ps-nav-bar">
          <Brand />
          <nav className="ps-desktop-nav" aria-label="Main navigation">
            {links.map((link) => (
              <a href={link.href} key={link.href}>
                {link.title}
              </a>
            ))}
          </nav>
          <div className="ps-nav-actions">
            <AppLink compact />
            <DownloadLink compact />
            <button
              id="ps-menu-toggle"
              className="ps-menu-toggle"
              type="button"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              aria-controls="ps-mobile-nav"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <nav
          id="ps-mobile-nav"
          className="ps-mobile-nav"
          aria-label="Mobile navigation"
          hidden={!menuOpen}
        >
          {links.map((link) => (
            <a
              href={link.href}
              key={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.title}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </header>

      <main id="main">
        <section className="ps-hero ps-container" aria-labelledby="ps-headline">
          <div className="ps-hero-intro">
            <h1 id="ps-headline">
              See which API changes hit your code
              <span> before they break it.</span>
            </h1>
            <p className="ps-hero-copy">
              API maintenance and security review in one workspace. Know what
              your code depends on, what changed upstream, and what needs your
              attention.
            </p>
            <p className="ps-hero-free">
              <Check size={16} aria-hidden="true" /> Free. No card required.
            </p>
            <div className="ps-actions">
              <button
                className="ps-button ps-button-primary"
                type="button"
                onClick={() => {
                  setPlayRequest((request) => request + 1);
                  const demo = document.getElementById("how-it-works");
                  const rect = demo?.getBoundingClientRect();
                  // ponytail: only scroll when the demo isn't already on screen (side-by-side hero)
                  if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
                    demo?.scrollIntoView({
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                      ).matches
                        ? "auto"
                        : "smooth",
                      block: "center",
                    });
                  }
                  demo?.focus({ preventScroll: true });
                }}
              >
                See how it works
                <Play size={15} aria-hidden="true" />
              </button>
              <AppLink />
            </div>
            <p className="ps-hero-note">
              <GitBranch size={14} aria-hidden="true" />
              <span>
                Sign in with GitHub in your browser, or{" "}
                <a href="/download">download for macOS and Windows</a>.
              </span>
            </p>
          </div>
          <div className="ps-hero-figure">
            <ScenicSurface className="ps-hero-scenery">
              <ProductDemo playRequest={playRequest} />
            </ScenicSurface>
            <p className="ps-demo-footnote">
              <span>From upstream change to a reviewable patch.</span>
              <span>Play it. Pause it. Explore each step.</span>
            </p>
          </div>
        </section>

        <WorkflowRail />

        <FeatureTour />
        <ProductSimulations />

        <section
          id="security"
          className="ps-control-section ps-container"
          data-reveal="control"
          aria-labelledby="ps-control-heading"
        >
          <div className="ps-control-copy">
            <ShieldCheck
              className="ps-section-symbol"
              size={30}
              strokeWidth={1.4}
              aria-hidden="true"
            />
            <h2 id="ps-control-heading">
              More confidence.
              <br />
              <span>Still your call.</span>
            </h2>
            <p>
              A suggestion is only useful when you can understand it. Inspect
              the source, the affected code, and the checks before deciding what
              to ship.
            </p>
            <a className="ps-text-link" href="/download">
              Download the desktop app
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="ps-control-points" data-reveal="evidence">
            <article>
              <Check size={19} aria-hidden="true" />
              <div>
                <h3>Evidence you can follow</h3>
                <p>
                  Trace findings back to source changes and code locations.
                  Review the diff in the same place.
                </p>
              </div>
            </article>
            <article>
              <Check size={19} aria-hidden="true" />
              <div>
                <h3>Verification with clear limits</h3>
                <p>
                  Supported repairs include isolated checks. Missing coverage
                  and unresolved behavior stay visible.
                </p>
              </div>
            </article>
            <article>
              <Check size={19} aria-hidden="true" />
              <div>
                <h3>You decide what gets merged</h3>
                <p>
                  Start in manual mode. Choose your automation settings. Draft
                  pull requests remain yours to review.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section
          id="questions"
          className="ps-faq-section ps-container"
          aria-labelledby="ps-faq-heading"
        >
          <div>
            <h2 id="ps-faq-heading">
              A few things
              <br />
              <span>worth knowing.</span>
            </h2>
            <p>
              How it works, what it checks,
              <br className="ps-desktop-break" /> and where you stay in control.
            </p>
          </div>
          <div className="ps-faq-list">
            {questions.map((question) => (
              <SmoothDisclosure key={question.title} title={question.title}>
                {question.answer}
              </SmoothDisclosure>
            ))}
          </div>
        </section>

        <section
          id="contact"
          className="ps-contact ps-container"
          aria-labelledby="ps-contact-heading"
        >
          <div>
            <h2 id="ps-contact-heading">Contact us</h2>
            <p>
              Questions, a pilot for your team, or a walkthrough of your own
              repository? Book 30 minutes with the founders.
            </p>
          </div>
          <MeetingLink />
        </section>

        <section
          className="ps-close ps-container"
          aria-labelledby="ps-close-heading"
        >
          <ScenicSurface className="ps-close-scenery">
            <div className="ps-close-inner">
              <div>
                <h2 id="ps-close-heading">
                  Keep building.
                  <br />
                  <span>Know what needs a second look.</span>
                </h2>
                <p>
                  Open ProtectSUS in your browser, get it for Mac or Windows, or
                  book a meeting and walk through it with us.
                </p>
              </div>
              <div className="ps-actions">
                <AppLink />
                <DownloadLink />
                <MeetingLink />
              </div>
            </div>
          </ScenicSurface>
        </section>
      </main>
      <footer className="ps-footer ps-container">
        <Brand footer />
        <div className="ps-footer-links">
          <a href="#product">Product</a>
          <a href="#questions">FAQ</a>
          <a href="#contact">Contact</a>
          <a href="/download">
            Download desktop app
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
        <small>© {new Date().getFullYear()} ProtectSUS</small>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return (
    <MotionProvider>
      <LandingContent />
    </MotionProvider>
  );
}
