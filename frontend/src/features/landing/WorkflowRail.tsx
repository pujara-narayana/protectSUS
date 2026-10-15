"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch, Globe2, ScanLine, GitPullRequest } from "lucide-react";

export default function WorkflowRail() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.4 },
    );
    if (root.current) observer.observe(root.current);
    const hidden = () => {
      if (document.hidden) setVisible(false);
      else if (root.current) {
        const rect = root.current.getBoundingClientRect();
        setVisible(rect.top < innerHeight && rect.bottom > 0);
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  return (
    <div
      ref={root}
      className="ps-workflow-rail ps-container"
      data-visible={visible}
      aria-label="Workflow: connect GitHub, follow sources, review evidence, prepare a draft"
    >
      <p>A clear path from change to review.</p>
      <div className="ps-rail-stages">
        {[
          {
            Icon: GitBranch,
            title: "Your repository",
            detail: "Connect GitHub",
          },
          {
            Icon: Globe2,
            title: "Upstream changes",
            detail: "Follow the source",
          },
          {
            Icon: ScanLine,
            title: "Code & evidence",
            detail: "Review the impact",
          },
          {
            Icon: GitPullRequest,
            title: "Your next step",
            detail: "Prepare a draft",
          },
        ].map(({ Icon, title, detail }, index) => (
          <div
            className="ps-rail-stage"
            key={title}
            style={{ "--rail-order": index } as React.CSSProperties}
          >
            <div className="ps-rail-symbol">
              <Icon size={21} strokeWidth={1.5} />
            </div>
            <strong>{title}</strong>
            <span>{detail}</span>
            {index < 3 && (
              <span className="ps-rail-connection" aria-hidden="true">
                <span />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
