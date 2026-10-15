"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  GitBranch,
  Globe2,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import { ScenicSurface, usePageMotion } from "./PageMotion";

const stages = [
  {
    id: "graph",
    Icon: GitBranch,
    title: "Understand your integrations",
    description:
      "Connect a repository and see how its files, functions, and API integrations fit together. Explore the code behind each connection.",
    image: "/landing/graph.webp",
    alt: "Actual ProtectSUS knowledge graph with illustrative repository integrations.",
    note: "Follow the connection",
    file: "catalog.ts → Catalog API",
    detail: "Files, functions, and integrations in context.",
  },
  {
    id: "review",
    Icon: Globe2,
    title: "Turn changes into a clear next step",
    description:
      "Follow upstream sources, inspect the affected code, and review a proposed patch alongside its evidence and verification results.",
    image: "/landing/review.webp",
    alt: "Actual ProtectSUS review interface with an illustrative endpoint migration.",
    note: "From source to proposed patch",
    file: "/v1/products → /v2/items",
    detail: "The change and the code it touches, together.",
  },
  {
    id: "security",
    Icon: ShieldCheck,
    title: "Give security findings context",
    description:
      "Review supported static security checks with the file, line, and recommendation attached. Coverage and limitations stay visible.",
    image: "/landing/security.webp",
    alt: "Actual ProtectSUS security view with illustrative static findings.",
    note: "See exactly where to look",
    file: "client.py · TLS verification",
    detail: "A potential risk, attached to its code.",
  },
];

export default function FeatureTour() {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [automatic, setAutomatic] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const { paused, resume } = usePageMotion();
  const running = automatic && visible && documentVisible && !paused;
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.28 },
    );
    if (root.current) observer.observe(root.current);
    const visibility = () => setDocumentVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setProgress((current) => Math.min(1, current + 0.1 / 6)),
      100,
    );
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (progress < 1) return;
    if (stage < stages.length - 1) {
      setStage((current) => current + 1);
      setProgress(0);
    } else setAutomatic(false);
  }, [progress, stage]);
  const select = (index: number) => {
    setAutomatic(false);
    setProgress(0);
    setStage(index);
  };
  const toggle = () => {
    if (automatic && !paused) setAutomatic(false);
    else {
      if (progress >= 1) {
        setStage(0);
        setProgress(0);
      }
      setAutomatic(true);
      resume();
    }
  };
  return (
    <section
      ref={root}
      id="product"
      className="ps-product-section ps-container ps-feature-tour"
      aria-labelledby="ps-product-heading"
      data-tour-running={running}
    >
      <div className="ps-section-intro" data-reveal="heading">
        <h2 id="ps-product-heading">
          The context you need.
          <br />
          <span>The next step, made clear.</span>
        </h2>
        <p>
          Go from a repository full of dependencies to the specific code that
          deserves a closer look.
        </p>
      </div>
      <div className="ps-tour-layout">
        <div className="ps-tour-copy">
          <div
            className="ps-tour-tabs"
            role="tablist"
            aria-label="Explore ProtectSUS"
            aria-orientation="vertical"
          >
            {stages.map(({ id, Icon, title, description }, index) => (
              <button
                key={id}
                id={`ps-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={stage === index}
                aria-controls="ps-workflow-panel"
                tabIndex={stage === index ? 0 : -1}
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                onClick={() => select(index)}
                onFocus={() => setAutomatic(false)}
                onKeyDown={(event) => {
                  let next = index;
                  if (["ArrowDown", "ArrowRight"].includes(event.key))
                    next = (index + 1) % stages.length;
                  else if (["ArrowUp", "ArrowLeft"].includes(event.key))
                    next = (index + stages.length - 1) % stages.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = stages.length - 1;
                  else return;
                  event.preventDefault();
                  select(next);
                  buttons.current[next]?.focus();
                }}
                style={
                  {
                    "--tour-progress":
                      stage === index ? progress : index < stage ? 1 : 0,
                  } as CSSProperties
                }
              >
                <span className="ps-tour-label">
                  <Icon size={18} />
                  <span>{title}</span>
                  <ArrowRight size={16} />
                </span>
                <span className="ps-tour-description">
                  <span>{description}</span>
                </span>
                <span className="ps-tour-progress" aria-hidden="true" />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ps-tour-play"
            onClick={toggle}
            aria-label={
              automatic && !paused ? "Pause feature tour" : "Play feature tour"
            }
          >
            {automatic && !paused ? <Pause size={13} /> : <Play size={13} />}
            <span>{automatic && !paused ? "Pause tour" : "Play tour"}</span>
          </button>
        </div>
        <ScenicSurface className="ps-tour-scenery">
          <div
            id="ps-workflow-panel"
            role="tabpanel"
            aria-labelledby={`ps-tab-${stages[stage].id}`}
            tabIndex={0}
            className="ps-tour-window"
          >
            {stages.map((item, index) => (
              <figure
                key={item.id}
                className="ps-tour-frame"
                data-active={index === stage}
                aria-hidden={index !== stage}
              >
                <img
                  className="ps-tour-screenshot"
                  src={item.image}
                  alt={item.alt}
                  width={2160}
                  height={1350}
                  loading="lazy"
                />
                <figcaption>Actual interface · illustrative data</figcaption>
              </figure>
            ))}
          </div>
          <div className="ps-tour-note" key={stage} aria-hidden="true">
            <span className="ps-tour-note-icon">
              <Check size={17} />
            </span>
            <div>
              <span>{stages[stage].note}</span>
              <strong>{stages[stage].file}</strong>
              <p>{stages[stage].detail}</p>
            </div>
          </div>
          <p className="ps-tour-credit">
            Actual interface · illustrative example data
          </p>
        </ScenicSurface>
      </div>
    </section>
  );
}
