"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileCode2,
  GitBranch,
  GitPullRequest,
  Globe2,
  Layers3,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { ScenicSurface, usePageMotion } from "./PageMotion";

// Three authored, finite simulations. One local clock coordinates each scene's
// records, connections, inspectors and progress; no network or customer data.
const DURATION = 20000;
const STEPS = [0, 5000, 10000, 15000];
function useSequence() {
  const root = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [automatic, setAutomatic] = useState(true);
  const [staticScene, setStaticScene] = useState(false);
  const [visible, setVisible] = useState(false);
  const [awake, setAwake] = useState(true);
  const { paused, resume } = usePageMotion();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTime(DURATION);
      setAutomatic(false);
      setStaticScene(true);
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: 0.35 },
    );
    if (root.current) observer.observe(root.current);
    const sync = () => setAwake(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  const running = automatic && visible && awake && !paused && time < DURATION;
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(
      () => setTime((t) => Math.min(DURATION, t + 100)),
      100,
    );
    return () => clearInterval(interval);
  }, [running]);
  const jump = (step: number) => {
    setStaticScene(true);
    setAutomatic(false);
    setTime(STEPS[step] + 4200);
  };
  const toggle = () => {
    if (automatic && !paused && time < DURATION) setAutomatic(false);
    else {
      if (time >= DURATION) {
        setTime(0);
        setStaticScene(false);
      }
      setAutomatic(true);
      resume();
    }
  };
  const replay = () => {
    setStaticScene(false);
    setTime(0);
    setAutomatic(true);
    resume();
  };
  return {
    root,
    time,
    staticScene,
    running,
    phase: Math.min(3, Math.floor(time / 5000)),
    jump,
    toggle,
    replay,
    playing: automatic && !paused && time < DURATION,
  };
}
type Sequence = ReturnType<typeof useSequence>;
function Transport({
  sequence: s,
  labels,
  name,
}: {
  sequence: Sequence;
  labels: string[];
  name: string;
}) {
  return (
    <div className="ps-sim-transport" aria-label={`${name} animation controls`}>
      <div className="ps-sim-chapters">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => s.jump(i)}
            aria-pressed={s.phase === i}
            aria-label={`${name}: ${label}`}
            style={
              {
                "--chapter-progress": Math.max(
                  0,
                  Math.min(1, (s.time - STEPS[i]) / 5000),
                ),
              } as CSSProperties
            }
          >
            <span>{label}</span>
            <i />
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ps-sim-icon-button"
        onClick={s.toggle}
        aria-label={`${s.playing ? "Pause" : "Play"} ${name}`}
      >
        {s.playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button
        type="button"
        className="ps-sim-icon-button"
        onClick={s.replay}
        aria-label={`Replay ${name}`}
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
function Scene({
  s,
  name,
  children,
  labels,
  image,
}: {
  s: Sequence;
  name: string;
  children: ReactNode;
  labels: string[];
  image?: string;
}) {
  return (
    <ScenicSurface className="ps-simulation-scenery" image={image}>
      <div
        ref={s.root}
        className="ps-simulation"
        data-simulation={name}
        data-running={s.running}
        data-static={s.staticScene}
        data-phase={s.phase}
        data-time={s.time}
      >
        <div className="ps-sim-canvas">{children}</div>
        <Transport sequence={s} labels={labels} name={name} />
      </div>
      <div className="ps-sim-caption">
        <span>Illustrative product walkthrough</span>
        <span>Play. Pause. Explore.</span>
      </div>
    </ScenicSurface>
  );
}
const integrations = [
  {
    name: "Catalog API",
    short: "CA",
    file: "catalog.ts",
    source: "OpenAPI",
    calls: 4,
    endpoint: "/v1/products",
    state: "Change detected",
    tone: "amber",
  },
  {
    name: "Payments API",
    short: "PA",
    file: "payments.ts",
    source: "API docs",
    calls: 3,
    endpoint: "/v1/payments",
    state: "Source linked",
    tone: "blue",
  },
  {
    name: "Identity API",
    short: "ID",
    file: "auth.ts",
    source: "OpenAPI",
    calls: 2,
    endpoint: "/oauth/token",
    state: "Source linked",
    tone: "blue",
  },
  {
    name: "Delivery API",
    short: "DE",
    file: "delivery.ts",
    source: "API docs",
    calls: 2,
    endpoint: "/v1/shipments",
    state: "Source linked",
    tone: "blue",
  },
  {
    name: "Search API",
    short: "SE",
    file: "search.ts",
    source: "OpenAPI",
    calls: 3,
    endpoint: "/v1/search",
    state: "Source linked",
    tone: "blue",
  },
  {
    name: "Legacy client",
    short: "LC",
    file: "client.py",
    source: "Not linked",
    calls: 1,
    endpoint: "requests.get(url)",
    state: "Review TLS",
    tone: "amber",
  },
];
function Inventory() {
  const s = useSequence();
  const [selected, setSelected] = useState(0);
  const item = integrations[selected];
  const picker = useRef<HTMLSelectElement>(null);
  const count = Math.min(6, Math.floor(s.time / 550) + 1);
  const linked = s.time >= 5000;
  const inspecting = s.time >= 10000;
  const attention = s.time >= 15000;
  useEffect(() => {
    if (inspecting && document.activeElement?.closest(".ps-inventory-table"))
      picker.current?.focus({ preventScroll: true });
  }, [inspecting]);
  return (
    <Scene
      s={s}
      name="integration inventory"
      labels={["Discover", "Resolve", "Inspect", "Prioritize"]}
      image="/landing/dunes.webp"
    >
      <div className="ps-sim-heading">
        <div>
          <Layers3 size={17} />
          <strong>Integrations</strong>
          <span>{count} discovered</span>
        </div>
        <span className="ps-sim-repo">
          <GitBranch size={12} /> storefront / main
        </span>
      </div>
      <div className="ps-inventory-toolbar">
        <span>
          <Search size={13} />
          {s.time < 3500 ? "Reading repository…" : "API usage across your code"}
        </span>
        <span className="ps-sim-pill">
          {linked ? "Sources resolved" : "Indexing"}
          <i className={linked ? "ps-dot-complete" : "ps-dot-working"} />
        </span>
      </div>
      <div
        className="ps-inventory-table"
        role="table"
        aria-label="Example integrations"
        aria-hidden={inspecting}
      >
        <div className="ps-inventory-columns" role="row">
          <span role="columnheader">Integration</span>
          <span role="columnheader">Source</span>
          <span role="columnheader">Calls</span>
          <span role="columnheader">Status</span>
        </div>
        {integrations.slice(0, count).map((row, i) => {
          const resolved = s.time > 5000 + i * 350;
          return (
            <div
              className="ps-inventory-row"
              role="row"
              key={row.name}
              data-selected={inspecting && selected === i}
              style={{ "--row-index": i } as CSSProperties}
            >
              <div role="cell">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(i);
                    s.jump(3);
                  }}
                  aria-label={`Inspect ${row.name}`}
                  tabIndex={inspecting ? -1 : 0}
                  aria-pressed={inspecting && selected === i}
                >
                  <span className={`ps-service-mark ps-tone-${row.tone}`}>
                    {row.short}
                  </span>
                  <span>
                    <strong>{row.name}</strong>
                    <small>src/api/{row.file}</small>
                  </span>
                </button>
              </div>
              <span role="cell">
                {resolved ? (
                  <span className="ps-cell-resolved">
                    {i === 5 ? <ShieldCheck size={11} /> : <Globe2 size={11} />}
                    {row.source}
                  </span>
                ) : (
                  <i className="ps-field-loading" />
                )}
              </span>
              <span role="cell">{resolved ? row.calls : "-"}</span>
              <span role="cell">
                <span
                  className={
                    attention ? `ps-state ps-tone-${row.tone}` : "ps-state"
                  }
                >
                  {resolved ? (attention ? row.state : "Indexed") : "Reading…"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="ps-inventory-bottom">
        <span>
          <Check size={12} /> Source code stays read-only during indexing
        </span>
        <span>{linked ? "15 call sites" : "Mapping call sites…"}</span>
      </div>
      {inspecting && (
        <div className="ps-inventory-inspector">
          <div className="ps-inspector-picker">
            <select
              ref={picker}
              aria-label="Choose example integration"
              value={selected}
              onChange={(event) => {
                setSelected(Number(event.target.value));
                s.jump(3);
              }}
            >
              {integrations.map((row, i) => (
                <option value={i} key={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Close integration details"
              onClick={() => s.jump(1)}
            >
              <X size={13} />
            </button>
          </div>
          <div className="ps-inspector-identity">
            <span className={`ps-service-mark ps-tone-${item.tone}`}>
              {item.short}
            </span>
            <div>
              <strong>{item.name}</strong>
              <small>Integration context</small>
            </div>
            <span className={`ps-state ps-tone-${item.tone}`}>
              {attention ? item.state : "Mapped"}
            </span>
          </div>
          <div className="ps-inspector-facts">
            <span>
              <small>Call sites</small>
              <strong>{item.calls} in repository</strong>
            </span>
            <span>
              <small>Source</small>
              <strong>{item.source}</strong>
            </span>
          </div>
          <div className="ps-inspector-endpoint">
            <span>{selected === 5 ? "PY" : "GET"}</span>
            <code>{item.endpoint}</code>
          </div>
          <div className="ps-inspector-evidence">
            <FileCode2 size={14} />
            <span>
              <strong>{item.file}</strong>
              <small>
                {selected === 5
                  ? "TLS verification disabled · review required"
                  : selected === 0 && attention
                    ? "Endpoint migration found in linked specification"
                    : "Source and usage linked in one view"}
              </small>
            </span>
          </div>
          <p>
            <ChevronRight size={13} /> Select another integration to inspect its
            context.
          </p>
        </div>
      )}
    </Scene>
  );
}
const callers = [
  {
    file: "catalog.ts",
    fn: "listProducts()",
    line: 18,
    kind: "API client",
    code: 'return fetch("/v1/products");',
  },
  {
    file: "search.ts",
    fn: "searchProducts()",
    line: 32,
    kind: "Search service",
    code: "return listProducts(query);",
  },
  {
    file: "recommend.ts",
    fn: "getRelated()",
    line: 41,
    kind: "Recommendations",
    code: "const items = await listProducts();",
  },
];
function DependencyContext() {
  const s = useSequence();
  const [caller, setCaller] = useState(0);
  const item = callers[caller];
  const linked = s.time >= 5000;
  const traced = s.time >= 10000;
  const focused = s.time >= 15000;
  return (
    <Scene
      s={s}
      name="dependency context"
      labels={["Repository", "Connect", "Trace", "Open code"]}
    >
      <div className="ps-sim-heading">
        <div>
          <GitBranch size={17} />
          <strong>Dependency context</strong>
        </div>
        <span className="ps-sim-pill">Catalog API</span>
      </div>
      <div className="ps-context-breadcrumb">
        storefront <ChevronRight size={11} /> integrations{" "}
        <ChevronRight size={11} />
        <strong>Catalog API</strong>
      </div>
      <div className="ps-context-stage" data-focused={focused}>
        <div
          className="ps-dependency-map"
          aria-label="Catalog API connections to three repository functions"
        >
          <svg
            viewBox="0 0 580 235"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="ps-sim-map-wires"
          >
            <path className="ps-sim-map-wire" d="M108 118 H230" />
            {[
              "M306 118 H348 Q365 118 365 54 H439",
              "M306 118 H439",
              "M306 118 H348 Q365 118 365 182 H439",
            ].map((d, i) => (
              <g key={d} data-lit={linked && s.time >= 5200 + i * 750}>
                <path className="ps-sim-map-wire" d={d} />
                <path className="ps-sim-map-draw" d={d} pathLength="1" />
                <path
                  className="ps-sim-map-packet"
                  d={d}
                  pathLength="1"
                  style={{ animationDelay: `${i * 400}ms` }}
                />
              </g>
            ))}
          </svg>
          <div className="ps-sim-map-node ps-sim-map-repository">
            <GitBranch size={20} />
            <strong>storefront</strong>
            <small>Repository</small>
          </div>
          <div className="ps-sim-map-node ps-sim-map-service">
            <Globe2 size={21} />
            <strong>Catalog API</strong>
            <small>4 call sites</small>
            <span className="ps-sim-map-halo" />
          </div>
          {callers.map((row, i) => (
            <button
              type="button"
              className="ps-sim-map-function"
              key={row.file}
              data-connected={linked && s.time >= 5200 + i * 750}
              data-selected={traced && caller === i}
              style={{ "--node-y": `${23 + i * 27.5}%` } as CSSProperties}
              onClick={() => {
                setCaller(i);
                s.jump(3);
              }}
              aria-label={`Inspect ${row.fn}`}
              aria-pressed={traced && caller === i}
            >
              <FileCode2 size={13} />
              <span>
                <strong>{row.file}</strong>
                <small>{row.fn}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="ps-context-summary">
          <span>
            <i className={linked ? "ps-dot-complete" : "ps-dot-working"} />
            {linked
              ? "Source → integration → callers"
              : "Building repository context"}
          </span>
          <span>
            {linked ? "3 connected functions" : "Resolving connections…"}
          </span>
        </div>
        {traced && (
          <div className="ps-context-inspector" data-expanded={focused}>
            <div className="ps-context-file-tabs">
              {callers.map((row, i) => (
                <button
                  type="button"
                  key={row.file}
                  onClick={() => {
                    setCaller(i);
                    s.jump(3);
                  }}
                  aria-pressed={caller === i}
                >
                  <FileCode2 size={12} />
                  {row.file}
                </button>
              ))}
            </div>
            <div className="ps-context-code" key={item.file}>
              <div>
                <span>{item.kind}</span>
                <span>
                  src/api/{item.file}:{item.line}
                </span>
              </div>
              <code>
                <span>{item.line - 1}</span>
                <b>async function</b> {item.fn} {"{"}
              </code>
              <code className="ps-context-code-highlight">
                <span>{item.line}</span> {item.code}
              </code>
              <code>
                <span>{item.line + 1}</span>
                {"}"}
              </code>
            </div>
            {focused && (
              <div className="ps-context-link">
                <Globe2 size={13} />
                <span>Catalog API / OpenAPI specification</span>
                <Check size={13} />
                <strong>Evidence attached</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </Scene>
  );
}
const events = [
  {
    Icon: Globe2,
    title: "API specification changed",
    detail: "Catalog API · /v2/items replaces /v1/products",
    at: 1200,
  },
  {
    Icon: GitBranch,
    title: "Affected code identified",
    detail: "catalog.ts · listProducts() · line 18",
    at: 4300,
  },
  {
    Icon: ShieldCheck,
    title: "Security context attached",
    detail: "client.py · disabled TLS verification",
    at: 7600,
  },
];
function ChangeReview() {
  const s = useSequence();
  const diff = s.time >= 5000;
  const checks = s.time >= 10000;
  const draft = s.time >= 15000;
  const prompt = "Trace the Catalog API change to my code";
  const typed = prompt.slice(0, Math.floor(s.time / 35));
  return (
    <Scene
      s={s}
      name="change review"
      labels={["Source", "Evidence", "Checks", "Draft"]}
      image="/landing/dunes.webp"
    >
      <div className="ps-sim-heading">
        <div>
          <Radio size={17} />
          <strong>Change review</strong>
        </div>
        <span className="ps-sim-pill">Example activity</span>
      </div>
      <div className="ps-review-request">
        <span className="ps-review-request-icon">
          <Search size={14} />
        </span>
        <span>
          {typed}
          <i className={s.time < 1500 ? "ps-typing-caret" : "ps-typing-done"} />
        </span>
        <ArrowRight size={14} />
      </div>
      <div className="ps-review-body" data-diff={diff} data-draft={draft}>
        <div className="ps-review-feed">
          <div className="ps-review-feed-title">
            <span className={draft ? "ps-dot-complete" : "ps-dot-working"} />
            {draft ? "Ready for your review" : "Following the evidence"}
          </div>
          {events.map(({ Icon, title, detail, at }, i) => (
            <div
              className="ps-review-event"
              key={title}
              data-arrived={s.time >= at}
            >
              <div className="ps-review-event-track">
                <Icon size={14} />
                {i < 2 && <i />}
              </div>
              <div>
                <strong>{title}</strong>
                <p>{detail}</p>
                <span>
                  {i === 2
                    ? "Potential risk · review required"
                    : "Source evidence attached"}
                </span>
              </div>
              <Check size={12} />
            </div>
          ))}
          <div className="ps-review-source-note">
            <Globe2 size={13} />
            <span>Linked sources. Specific code. A traceable decision.</span>
          </div>
        </div>
        {diff && (
          <div className="ps-review-artifact">
            <div className="ps-review-artifact-heading">
              <FileCode2 size={13} />
              <span>catalog.ts</span>
              <small>Proposed patch</small>
            </div>
            <div className="ps-review-diff">
              <code>
                <span>18</span>
                <span>−</span> fetch("/v1/products")
              </code>
              <code>
                <span>18</span>
                <span>+</span> fetch("/v2/items")
              </code>
              <code>
                <span>19</span>
                <span> </span> .then(parseItems)
              </code>
            </div>
            <div
              className="ps-review-evidence-summary"
              aria-label="Attached example evidence"
            >
              <span>
                <Globe2 size={11} />
                <span>Specification changed · Catalog API</span>
              </span>
              <span>
                <GitBranch size={11} />
                <span>Affected code · catalog.ts:18</span>
              </span>
              <span>
                <ShieldCheck size={11} />
                <span>
                  {s.time >= 7600
                    ? "Potential TLS risk · client.py"
                    : "Security context pending"}
                </span>
              </span>
            </div>
            <div className="ps-review-checks">
              <span>Isolated verification</span>
              {["Patch syntax", "Contract replay", "Evidence linkage"].map(
                (label, i) => (
                  <div key={label}>
                    <span>{label}</span>
                    {checks && s.time >= 10500 + i * 1000 ? (
                      <span className="ps-check-result">
                        <Check size={12} />
                        Passed
                      </span>
                    ) : (
                      <span className="ps-check-wait">
                        {checks ? "Checking…" : "Queued"}
                      </span>
                    )}
                  </div>
                ),
              )}
              <p>Example results · not a live-provider test</p>
            </div>
            {draft && (
              <div className="ps-review-draft">
                <GitPullRequest size={17} />
                <div>
                  <strong>Draft ready to review</strong>
                  <span>Migrate Catalog API endpoint</span>
                </div>
                <span>Draft</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ps-review-footer">
        <ShieldCheck size={12} />
        <span>
          {draft
            ? "Your decision. No automatic merge."
            : "Manual review stays in control."}
        </span>
        <span>
          {draft
            ? "Review required"
            : checks
              ? "Verifying patch"
              : "Collecting evidence"}
        </span>
      </div>
    </Scene>
  );
}
export default function ProductSimulations() {
  return (
    <div className="ps-product-simulations ps-container">
      <section
        className="ps-simulation-story"
        aria-labelledby="ps-inventory-title"
      >
        <div className="ps-simulation-copy">
          <h2 id="ps-inventory-title">
            Know every API.
            <br />
            <span>Find what needs you.</span>
          </h2>
          <p>
            Bring API usage, linked sources, and code locations into one
            inventory. See which integrations have changed and which findings
            need a closer look.
          </p>
          <a href="#how-it-works" className="ps-text-link">
            Explore API maintenance <ArrowRight size={16} />
          </a>
        </div>
        <Inventory />
      </section>
      <section
        className="ps-simulation-story ps-simulation-story-reverse"
        aria-labelledby="ps-context-title"
      >
        <div className="ps-simulation-copy">
          <h2 id="ps-context-title">
            See the code behind
            <br />
            <span>every connection.</span>
          </h2>
          <p>
            Follow an integration into the files and functions that use it. Keep
            the source, call sites, and dependency context together as you
            investigate.
          </p>
          <a href="#product" className="ps-text-link">
            Explore dependency context <ArrowRight size={16} />
          </a>
        </div>
        <DependencyContext />
      </section>
      <section
        className="ps-simulation-story"
        aria-labelledby="ps-review-title"
      >
        <div className="ps-simulation-copy">
          <h2 id="ps-review-title">
            An upstream change.
            <br />
            <span>A next step you can trust.</span>
          </h2>
          <p>
            Move from a changed specification to affected code, security
            context, and a proposed patch. Inspect the evidence and checks
            before deciding what to ship.
          </p>
          <a href="#security" className="ps-text-link">
            See how you stay in control <ArrowRight size={16} />
          </a>
        </div>
        <ChangeReview />
      </section>
    </div>
  );
}
