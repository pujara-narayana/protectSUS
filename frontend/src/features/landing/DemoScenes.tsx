import {
  AlertTriangle,
  Check,
  CircleDashed,
  GitBranch,
  GitPullRequest,
  Globe2,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

/** Illustrative walkthrough scenes. `phase` is seconds into the chapter. */
type SceneProps = { phase: number };

export function DetectScene({ phase }: SceneProps) {
  return (
    <div className="ps-triage-scene">
      <div className="ps-source-event">
        <Globe2 size={18} />
        <div>
          <strong>Catalog API published spec v2.3</strong>
          <span>2 changes found · 1 touches code you call</span>
        </div>
        <span className="ps-event-tag">OpenAPI diff</span>
      </div>
      <div className="ps-triage-list">
        <div className="ps-triage-item is-breaking" data-shown={phase > 0.9}>
          <span className="ps-triage-tag">
            <AlertTriangle size={12} /> Breaking
          </span>
          <strong>
            <code>GET /v1/products</code> removed
          </strong>
          <span>Replaced by <code>GET /v2/items</code>. Sunset on Dec 1.</span>
          <div className="ps-triage-hits" data-shown={phase > 1.9}>
            <span>catalog.ts:18</span>
            <span>search.ts:42</span>
          </div>
          <em>Action needed · fix being prepared</em>
        </div>
        <div className="ps-triage-item is-feature" data-shown={phase > 3}>
          <span className="ps-triage-tag">
            <Lightbulb size={12} /> New feature
          </span>
          <strong>
            <code>include=availability</code> parameter added
          </strong>
          <span>Could replace the separate stock lookup in inventory.ts.</span>
          <em>Suggestion · goes to your weekly digest</em>
        </div>
      </div>
      <div className="ps-demo-result" data-shown={phase > 4.8}>
        <Check size={15} />
        <span>One action item, one suggestion. No alert noise.</span>
      </div>
    </div>
  );
}

const prChecks = [
  {
    label: "API usage",
    detail: "Adds a call to GET /v1/products, removed in spec v2.3",
    ok: false,
    icon: Globe2,
  },
  {
    label: "Security",
    detail: "New: TLS verification disabled · client.py:24",
    ok: false,
    icon: ShieldCheck,
  },
  {
    label: "Contracts",
    detail: "The other 6 API calls match current specs",
    ok: true,
    icon: Check,
  },
];

export function PullRequestScene({ phase }: SceneProps) {
  return (
    <div className="ps-pr-scene">
      <div className="ps-draft-title">
        <GitPullRequest size={24} />
        <div>
          <span>Pull request #128 · feature/bulk-import</span>
          <strong>Add bulk product import</strong>
        </div>
      </div>
      <div className="ps-pr-rows">
        {prChecks.map(({ label, detail, ok, icon: Icon }, index) => (
          <div
            key={label}
            className={`ps-pr-row ${ok ? "is-pass" : "is-problem"}`}
            data-shown={phase > 0.8 + index * 1.1}
          >
            <Icon size={16} />
            <div>
              <strong>{label}</strong>
              <span>{detail}</span>
            </div>
            <span className="ps-pr-status">{ok ? "Passed" : "Problem"}</span>
          </div>
        ))}
      </div>
      <div className="ps-verdict" data-shown={phase > 4.4}>
        <span className="ps-verdict-pill">Changes needed</span>
        <span>Posted as a GitHub check and a PR comment</span>
      </div>
    </div>
  );
}

const fixChecks = [
  { label: "Patch applies and parses", result: "Passed" },
  { label: "Contract replay against spec v2.3", result: "12 / 12" },
  { label: "Linked to the provider change", result: "Linked" },
];

export function FixScene({ phase }: SceneProps) {
  return (
    <div className="ps-draft-scene">
      <div className="ps-draft-title">
        <GitPullRequest size={24} />
        <div>
          <span>Draft pull request · fix/catalog-v2</span>
          <strong>Migrate Catalog API to /v2/items</strong>
        </div>
      </div>
      <div className="ps-code-diff ps-fix-diff">
        <div className="ps-code-title">
          src/api/catalog.ts <span>2 files · +4 −4</span>
        </div>
        <code className="ps-code-removed">
          <span>−</span> const res = await fetch(&quot;/v1/products&quot;);
        </code>
        <code className="ps-code-added" data-shown={phase > 0.8}>
          <span>+</span> const res = await fetch(&quot;/v2/items&quot;);
        </code>
        <code className="ps-code-removed">
          <span>−</span> return (await res.json()).products;
        </code>
        <code className="ps-code-added" data-shown={phase > 1.4}>
          <span>+</span> return (await res.json()).items;
        </code>
      </div>
      <div className="ps-draft-checks">
        {fixChecks.map(({ label, result }, index) => (
          <div key={label} data-complete={phase > 2 + index * 0.8}>
            <span>
              <Check size={14} />
            </span>
            {label}
            <small>{result}</small>
          </div>
        ))}
        <div className="is-pending">
          <span>
            <CircleDashed size={14} />
          </span>
          Your test suite
          <small>Runs in your CI</small>
        </div>
      </div>
      <div className="ps-review-gate" data-shown={phase > 4.8}>
        <span>
          <GitBranch size={17} /> Waiting for your review
        </span>
        <span>Never merged automatically</span>
      </div>
    </div>
  );
}
