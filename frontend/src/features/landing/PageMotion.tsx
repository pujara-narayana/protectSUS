"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play } from "lucide-react";

const MotionContext = createContext({
  paused: true,
  reduced: true,
  resume: () => {},
  toggle: () => {},
});
export const usePageMotion = () => useContext(MotionContext);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(true);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setReduced(media.matches);
      setPaused(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return (
    <MotionContext.Provider
      value={{
        paused,
        reduced,
        resume: () => setPaused(false),
        toggle: () => setPaused((value) => !value),
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}

export function MotionControl() {
  const { paused, toggle } = usePageMotion();
  return (
    <button
      className="ps-motion-control"
      type="button"
      onClick={toggle}
      aria-label={paused ? "Resume page motion" : "Pause page motion"}
    >
      {paused ? <Play size={13} /> : <Pause size={13} />}
      <span>{paused ? "Resume motion" : "Pause motion"}</span>
    </button>
  );
}

/** One scroll scheduler: no scroll interception and no idle animation loop. */
export function ScrollMotion() {
  const { paused, reduced } = usePageMotion();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ps-landing");
    if (!root) return;
    const scenes = [...root.querySelectorAll<HTMLElement>("[data-depth]")];
    const reveals = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    let frame = 0;
    const paint = () => {
      frame = 0;
      const viewport = innerHeight;
      root.dataset.scrolled = String(scrollY > 30);
      const scrollRange = document.documentElement.scrollHeight - viewport;
      root.style.setProperty(
        "--page-progress",
        String(scrollRange > 0 ? scrollY / scrollRange : 0),
      );
      for (const element of scenes) {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > viewport + 100) continue;
        const progress =
          (viewport * 0.5 - (rect.top + rect.height * 0.5)) / viewport;
        if (!paused || reduced)
          element.style.setProperty(
            "--depth-shift",
            `${reduced ? 0 : Math.max(-38, Math.min(38, progress * 52))}px`,
          );
      }
    };
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          element.dataset.inview = String(entry.isIntersecting);
          if (entry.isIntersecting) element.dataset.revealed = "true";
        }
      },
      { threshold: 0.12 },
    );
    [...new Set([...scenes, ...reveals])].forEach((element) =>
      observer.observe(element),
    );
    const visibility = () => {
      root.dataset.pageHidden = String(document.hidden);
      if (!document.hidden) schedule();
    };
    paint();
    visibility();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paused, reduced]);
  return null;
}

export function ScenicSurface({
  children,
  className = "",
  image = "/landing/atlantic.webp",
}: {
  children: ReactNode;
  className?: string;
  image?: string;
}) {
  return (
    <div className={`ps-scenic ${className}`} data-depth data-reveal="scene">
      <div className="ps-scenic-picture" aria-hidden="true">
        <img src={image} alt="" width={1600} height={1067} loading="lazy" />
      </div>
      <div className="ps-scenic-content">{children}</div>
    </div>
  );
}

/** Native details remains functional without JS; WAAPI animates open and close. */
export function SmoothDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const desiredOpen = useRef(false);
  const { paused, reduced } = usePageMotion();
  useEffect(() => () => animation.current?.cancel(), []);
  return (
    <details ref={details}>
      <summary
        onClick={(event) => {
          if (paused || reduced || !details.current || !content.current) return;
          event.preventDefault();
          const node = details.current;
          const start = node.getBoundingClientRect().height;
          const next = animation.current ? !desiredOpen.current : !node.open;
          desiredOpen.current = next;
          animation.current?.cancel();
          const summaryHeight =
            event.currentTarget.getBoundingClientRect().height;
          node.open = true;
          const end = next
            ? summaryHeight + content.current.getBoundingClientRect().height
            : summaryHeight;
          node.style.overflow = "clip";
          const current = node.animate(
            [{ height: `${start}px` }, { height: `${end}px` }],
            {
              duration: next ? 340 : 240,
              easing: "cubic-bezier(0.16,1,0.3,1)",
            },
          );
          animation.current = current;
          current.onfinish = () => {
            node.open = next;
            node.style.overflow = "";
            animation.current = null;
          };
        }}
      >
        {title}
        <span className="ps-faq-cross" aria-hidden="true" />
      </summary>
      <div ref={content} className="ps-faq-answer">
        <p>{children}</p>
      </div>
    </details>
  );
}
