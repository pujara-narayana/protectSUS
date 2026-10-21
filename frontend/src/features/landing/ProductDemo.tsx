"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Check,
  FileCode2,
  GitBranch,
  Globe2,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { DetectScene, FixScene, PullRequestScene } from "./DemoScenes";
import { usePageMotion } from "./PageMotion";

const chapters = [
  {
    title: "Map integrations",
    short: "Map",
    detail: "Follow an API back to the code that calls it.",
  },
  {
    title: "Sort what changed",
    short: "Detect",
    detail: "Breaking changes become action items. New features wait as suggestions.",
  },
  {
    title: "Check every pull request",
    short: "PR check",
    detail: "Each pull request gets a verdict for API and security problems.",
  },
  {
    title: "Prepare the fix",
    short: "Fix",
    detail: "A draft pull request with the diff, the checks, and what still needs you.",
  },
];
const CHAPTER_SECONDS = 8;
const DURATION = chapters.length * CHAPTER_SECONDS;

const RECORDING_ID = "Obq2vTh7gec";
const RECORDING_WATCH_URL = `https://youtu.be/${RECORDING_ID}`;
const RECORDING_EMBED_URL = `https://www.youtube.com/embed/${RECORDING_ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;

/** An explicitly illustrative, local-only walkthrough. Never calls product APIs. */
export default function ProductDemo({ playRequest }: { playRequest: number }) {
  const { paused: pagePaused, resume } = usePageMotion();
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<"walkthrough" | "recording">("walkthrough");
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [videoStarted, setVideoStarted] = useState(false);
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
    if (visible && pageVisible && !pagePaused && mode === "recording") return;
    // The embed keeps its position; the iframe API only pauses it.
    video.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
      "*",
    );
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

              {chapter === 1 && <DetectScene phase={phase} />}
              {chapter === 2 && <PullRequestScene phase={phase} />}
              {chapter === 3 && <FixScene phase={phase} />}
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
          {videoStarted ? (
            <iframe
              ref={video}
              className="ps-recording-frame"
              src={RECORDING_EMBED_URL}
              title="Recorded ProtectSUS security dashboard demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="ps-recording-poster"
              onClick={() => {
                resume();
                setVideoStarted(true);
              }}
              aria-label="Play the recorded ProtectSUS demo"
            >
              <img
                src="/landing/security-recording.webp"
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="ps-recording-play">
                <Play size={23} /> Watch the recording <span>on YouTube</span>
              </span>
            </button>
          )}
          <p className="ps-recording-caption">
            Recorded security dashboard: select a commit, open its audit view,
            and explore repository files. No completed audit result is shown.{" "}
            <a href={RECORDING_WATCH_URL} target="_blank" rel="noreferrer">
              Open it on YouTube
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
