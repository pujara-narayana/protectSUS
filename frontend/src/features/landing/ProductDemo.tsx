"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  FileCode2,
  GitBranch,
  GitPullRequest,
  Globe2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { usePageMotion } from "./PageMotion";

const chapters = [
  {
    title: "Map integrations",
    short: "Map",
    detail: "Follow an API back to the code that calls it.",
  },
  {
    title: "Catch a change",
    short: "Detect",
    detail: "An upstream change becomes a specific code review.",
  },
  {
    title: "Review security",
    short: "Review",
    detail: "See the finding, its location, and the safer pattern.",
  },
  {
    title: "Prepare a draft",
    short: "Prepare",
    detail: "Review the patch and its verification scope before merging.",
  },
];
const CHAPTER_SECONDS = 7;
const DURATION = chapters.length * CHAPTER_SECONDS;

/** An explicitly illustrative, local-only walkthrough. Never calls product APIs. */
export default function ProductDemo({ playRequest }: { playRequest: number }) {
  const { paused: pagePaused, resume } = usePageMotion();
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<"walkthrough" | "recording">("walkthrough");
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const chapter = Math.min(
    chapters.length - 1,
    Math.floor(seconds / CHAPTER_SECONDS),
  );
  const phase = seconds - chapter * CHAPTER_SECONDS;
  const running =
    playing && visible && pageVisible && !pagePaused && mode === "walkthrough";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    setPlaying(!media.matches);
    const change = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    const visibility = () => setPageVisible(!document.hidden);
    visibility();
    media.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", change);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    let frame: number;
    let previous = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      elapsed += Math.min((now - previous) / 1000, 0.1);
      previous = now;
      // Update at 20 fps; CSS handles the spatial transitions between story beats.
      if (elapsed >= 0.05) {
        const delta = elapsed;
        elapsed = 0;
        setSeconds((current) => Math.min(DURATION, current + delta));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (seconds >= DURATION) setPlaying(false);
  }, [seconds]);
  useEffect(() => {
    if (playRequest === 0) return;
    resume();
    setMode("walkthrough");
    setSeconds(0);
    setPlaying(true);
  }, [playRequest]);
  useEffect(() => {
    if (!visible || !pageVisible || pagePaused || mode !== "recording")
      video.current?.pause();
  }, [visible, pageVisible, pagePaused, mode]);

  const seek = (index: number) => {
    setSeconds(index * CHAPTER_SECONDS + (playing ? 0 : 6));
  };
  const toggle = () => {
    if (pagePaused) {
      resume();
      setPlaying(true);
      return;
    }
    if (seconds >= DURATION) setSeconds(0);
    setPlaying(!playing);
  };
  const switchMode = (next: "walkthrough" | "recording") => {
    setMode(next);
    if (next === "recording") setPlaying(false);
  };

  return (
    <div
      ref={root}
      id="how-it-works"
      className="ps-demo"
      data-running={running}
      data-reduced={reduced}
      tabIndex={-1}
      aria-label="ProtectSUS product demonstration"
    >
      <div className="ps-demo-topline">
        <div className="ps-demo-modes" role="group" aria-label="Choose a demo">
          <button
            type="button"
            aria-pressed={mode === "walkthrough"}
            onClick={() => switchMode("walkthrough")}
          >
            Product walkthrough
          </button>
          <button
            type="button"
            aria-pressed={mode === "recording"}
            onClick={() => switchMode("recording")}
          >
            Recorded demo <Play size={12} aria-hidden="true" />
          </button>
        </div>
        <span className="ps-demo-disclosure">
          {mode === "walkthrough"
            ? "Illustrative example"
            : "Security dashboard recording"}
        </span>
      </div>

      {mode === "walkthrough" ? (
        <>
          <div className="ps-demo-stage" data-chapter={chapter}>
            <aside className="ps-demo-context">
              <div className="ps-demo-repo">
                <GitBranch size={16} />
                <span>example / storefront</span>
              </div>
              <h2 key={chapter}>
                {chapters[chapter].title}
                <span>.</span>
              </h2>
              <p>{chapters[chapter].detail}</p>
              <div className="ps-demo-context-bottom">
                <span className="ps-demo-count">
                  0{chapter + 1}
                  <span> / 04</span>
                </span>
                <span>
                  API maintenance
                  <br />& security review
                </span>
              </div>
            </aside>

            <div className="ps-demo-visual" key={chapter}>
              {chapter === 0 && (
                <div className="ps-map-scene">
                  <div className="ps-map-node ps-map-source">
                    <Globe2 size={23} />
                    <div>
                      <strong>Catalog API</strong>
                      <span>api.example.com</span>
                    </div>
                  </div>
                  <svg
                    className="ps-map-lines"
                    viewBox="0 0 620 300"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      className="ps-map-wire"
                      d="M310 45V115Q310 135 290 135H120Q100 135 100 155V240M310 115V240M310 115Q310 135 330 135H500Q520 135 520 155V240"
                    />
                    <path
                      className="ps-map-trace"
                      style={{
                        strokeDashoffset: Math.max(0, 800 - phase * 210),
                      }}
                      d="M310 45V115Q310 135 290 135H120Q100 135 100 155V240M310 115V240M310 115Q310 135 330 135H500Q520 135 520 155V240"
                    />
                  </svg>
                  <div className="ps-map-files">
                    {["catalog.ts", "checkout.ts", "inventory.ts"].map(
                      (file, index) => (
                        <div
                          className="ps-map-node ps-map-file"
                          data-lit={phase > 1 + index * 0.65}
                          key={file}
                        >
                          <FileCode2 size={21} />
                          <strong>{file}</strong>
                          <span>
                            {
                              [
                                "fetchCatalog()",
                                "loadProducts()",
                                "syncStock()",
                              ][index]
                            }
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="ps-demo-result" data-shown={phase > 3.3}>
                    <Check size={15} />
                    <span>One integration. Its calling code, connected.</span>
                  </div>
                </div>
              )}

              {chapter === 1 && (
                <div className="ps-change-scene">
                  <div className="ps-source-event">
                    <Globe2 size={18} />
                    <div>
                      <strong>Catalog API specification changed</strong>
                      <span>A removed endpoint affects catalog.ts</span>
                    </div>
                    <span className="ps-event-tag">Source diff</span>
                  </div>
                  <div className="ps-code-diff">
                    <div className="ps-code-title">
                      <FileCode2 size={16} /> src/api/catalog.ts{" "}
                      <span>Proposed patch</span>
                    </div>
                    <code className="ps-code-context">
                      export async function fetchCatalog() {"{"}
                    </code>
                    <code className="ps-code-removed">
                      <span>−</span> return fetch(&quot;/v1/products&quot;);
                    </code>
                    <code className="ps-code-added" data-shown={phase > 1.6}>
                      <span>+</span> return fetch(&quot;/v2/items&quot;);
                    </code>
                    <code className="ps-code-context">{"}"}</code>
                  </div>
                  <div className="ps-evidence-link" data-shown={phase > 3.3}>
                    <span className="ps-evidence-line" />
                    <Globe2 size={15} />
                    <span>Linked to the source change</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              )}

              {chapter === 2 && (
                <div className="ps-security-scene">
                  <div className="ps-security-label">
                    <ShieldCheck size={18} />
                    <span>Static security review</span>
                    <span>Python</span>
                  </div>
                  <div className="ps-security-code">
                    <span className="ps-code-title">
                      <FileCode2 size={16} /> integrations/client.py:24
                    </span>
                    <code>
                      requests.get(url,{" "}
                      <mark data-shown={phase > 1}>verify=False</mark>)
                    </code>
                    <span className="ps-code-scan" aria-hidden="true" />
                  </div>
                  <div className="ps-finding" data-shown={phase > 2}>
                    <span className="ps-finding-marker">
                      <ShieldCheck size={19} />
                    </span>
                    <div>
                      <strong>TLS verification is disabled</strong>
                      <p>
                        Review this call and restore certificate verification.
                      </p>
                      <span>Potential risk · requires review</span>
                    </div>
                  </div>
                  <div className="ps-demo-result" data-shown={phase > 4.5}>
                    <FileCode2 size={15} />
                    <span>The finding stays attached to the code.</span>
                  </div>
                </div>
              )}

              {chapter === 3 && (
                <div className="ps-draft-scene">
                  <div className="ps-draft-title">
                    <GitPullRequest size={26} />
                    <div>
                      <span>Draft pull request</span>
                      <strong>Update Catalog API endpoint</strong>
                    </div>
                  </div>
                  <div className="ps-draft-checks">
                    {[
                      "Source change linked",
                      "Proposed diff ready",
                      "Verification scope recorded",
                    ].map((label, index) => (
                      <div
                        key={label}
                        data-complete={phase > 0.8 + index * 1.1}
                      >
                        <span>
                          <Check size={14} />
                        </span>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="ps-review-gate" data-shown={phase > 4}>
                    <span>
                      <GitBranch size={17} /> Your review comes next.
                    </span>
                    <span>No automatic merge</span>
                  </div>
                  <p className="ps-demo-limits">
                    Supported contract repairs only. Isolated checks do not
                    establish live-provider correctness.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="ps-demo-controls">
            <button
              className="ps-demo-play"
              type="button"
              onClick={toggle}
              aria-label={
                playing && !pagePaused
                  ? "Pause walkthrough"
                  : seconds >= DURATION
                    ? "Replay walkthrough"
                    : "Play walkthrough"
              }
            >
              {playing && !pagePaused ? (
                <Pause size={17} />
              ) : seconds >= DURATION ? (
                <RotateCcw size={17} />
              ) : (
                <Play size={17} />
              )}
            </button>
            <div
              className="ps-demo-chapters"
              role="group"
              aria-label="Walkthrough chapters"
            >
              {chapters.map((item, index) => (
                <button
                  key={item.short}
                  type="button"
                  aria-current={chapter === index ? "step" : undefined}
                  aria-label={`Show chapter ${index + 1}: ${item.title}`}
                  onClick={() => seek(index)}
                  style={
                    {
                      "--chapter-progress": `${Math.max(0, Math.min(100, ((seconds - index * CHAPTER_SECONDS) / CHAPTER_SECONDS) * 100))}%`,
                    } as CSSProperties
                  }
                >
                  <span className="ps-chapter-track">
                    <span />
                  </span>
                  <span className="ps-chapter-name">{item.short}</span>
                </button>
              ))}
            </div>
            <span className="ps-demo-time">
              {Math.floor(seconds).toString().padStart(2, "0")} / {DURATION}s
            </span>
          </div>
        </>
      ) : (
        <div className="ps-recording">
          <video
            ref={video}
            controls
            playsInline
            preload="metadata"
            poster="/landing/security-recording.webp"
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onEnded={() => setVideoPlaying(false)}
            onError={() => setVideoError(true)}
            aria-label="Recorded ProtectSUS security dashboard demo"
          >
            <source src="/landing/security-demo.mp4" type="video/mp4" />
            <track
              default
              kind="captions"
              src="/landing/security-demo.vtt"
              srcLang="en"
              label="English"
            />
            Your browser does not support video playback.
          </video>
          {!videoPlaying && !videoError && (
            <button
              type="button"
              className="ps-recording-play"
              onClick={() => {
                resume();
                void video.current?.play().catch(() => setVideoError(true));
              }}
            >
              <Play size={23} /> Watch the recording <span>11 seconds</span>
            </button>
          )}
          {videoError && (
            <p className="ps-recording-error">
              The recording could not play.{" "}
              <a href="/landing/security-demo.mp4">Open the video</a> or select
              the product walkthrough above.
            </p>
          )}
          <p className="ps-recording-caption">
            Recorded security dashboard: select a commit, open its audit view,
            and explore repository files. No completed audit result is shown.
          </p>
        </div>
      )}
    </div>
  );
}
