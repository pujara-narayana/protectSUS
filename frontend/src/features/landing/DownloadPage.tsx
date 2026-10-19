"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, Globe, Laptop, Monitor } from "lucide-react";
import "./landing.css";
import "./download.css";
import { recordVisit } from "./visit";

const RELEASES = "https://github.com/Samarpan1122/protectsus-releases/releases";
const LATEST_API = "https://api.github.com/repos/Samarpan1122/protectsus-releases/releases/latest";
const WEB_APP = "https://91rwr78g0c.execute-api.us-east-1.amazonaws.com";
const COUNTDOWN_SECONDS = 5;

type Target = "mac-arm" | "mac-intel" | "windows";
type Installers = Record<Target, string> & { version: string };

// Used if GitHub's API is unreachable or rate-limited; the release page link always works.
const FALLBACK: Installers = {
  version: "0.3.0",
  "mac-arm": `${RELEASES}/latest/download/ProtectSUS-0.3.0-arm64.dmg`,
  "mac-intel": `${RELEASES}/latest/download/ProtectSUS-0.3.0.dmg`,
  windows: `${RELEASES}/latest/download/ProtectSUS-Setup-0.3.0.exe`,
};
const LABELS: Record<Target, string> = { "mac-arm": "Mac (Apple Silicon)", "mac-intel": "Mac (Intel)", windows: "Windows" };
const TARGETS = Object.keys(LABELS) as Target[];

async function latestInstallers(): Promise<Installers> {
  try {
    const response = await fetch(LATEST_API, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) return FALLBACK;
    const release = await response.json() as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] };
    const find = (pattern: RegExp) => release.assets?.find(asset => pattern.test(asset.name))?.browser_download_url;
    const mac = find(/-arm64\.dmg$/), intel = find(/^ProtectSUS-[\d.]+\.dmg$/), windows = find(/Setup.*\.exe$/);
    if (!mac || !intel || !windows) return FALLBACK;
    return { version: (release.tag_name || FALLBACK.version).replace(/^v/, ""), "mac-arm": mac, "mac-intel": intel, windows };
  } catch {
    return FALLBACK;
  }
}

/** Mac chip detection: Chromium reports it directly; elsewhere the GPU name reveals Intel Macs. */
async function macChip(): Promise<"arm" | "intel"> {
  const uaData = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }> } }).userAgentData;
  try {
    const { architecture } = await uaData?.getHighEntropyValues?.(["architecture"]) ?? {};
    if (architecture === "arm") return "arm";
    if (architecture === "x86") return "intel";
  } catch { /* fall through */ }
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    const renderer = info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/Intel|AMD|Radeon|NVIDIA/i.test(renderer)) return "intel";
  } catch { /* fall through */ }
  // ponytail: Macs sold since late 2020 are Apple Silicon, so an ambiguous Mac defaults to it; the Intel link stays one click away.
  return "arm";
}

async function detectTarget(): Promise<Target | null> {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return null;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return (await macChip()) === "arm" ? "mac-arm" : "mac-intel";
  return null;
}

export default function DownloadPage() {
  const [installers, setInstallers] = useState<Installers | null>(null);
  const [target, setTarget] = useState<Target | null | undefined>(undefined);
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    recordVisit("download");
    void Promise.all([latestInstallers(), detectTarget()]).then(([found, detected]) => { setInstallers(found); setTarget(detected); });
  }, []);

  const url = installers && target ? installers[target] : undefined;
  useEffect(() => {
    if (!url || cancelled || started) return;
    if (seconds <= 0) { setStarted(true); window.location.href = url; return; }
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [url, seconds, cancelled, started]);

  const headline = target === undefined ? "Finding the right download…"
    : target === null ? "ProtectSUS runs on Mac and Windows"
    : started ? `Downloading ProtectSUS for ${LABELS[target]}`
    : cancelled ? `ProtectSUS for ${LABELS[target]}`
    : `Your download starts in ${seconds}…`;
  const lede = target === undefined ? "Checking your computer so you get the right installer."
    : target === null ? "On this device, use ProtectSUS in your browser, or download it for your computer below."
    : started ? `Version ${installers?.version}. If nothing happened, use the button below.`
    : `Version ${installers?.version} for ${LABELS[target]}.`;

  return <main className="ps-landing ps-download">
    <a className="ps-download-back" href="/"><ArrowLeft size={16} aria-hidden="true" />ProtectSUS</a>
    <section className="ps-download-card" aria-live="polite">
      <img src="/logo-white.svg" width="34" height="44" alt="" />
      <h1>{headline}</h1>
      <p className="ps-download-lede">{lede}</p>

      {target && url && <div className="ps-download-actions">
        <a className="ps-button ps-button-primary" href={url} onClick={() => { setStarted(true); setCancelled(true); }}>
          <Download size={16} aria-hidden="true" />{started ? "Download again" : "Download now"}
        </a>
        {!started && !cancelled && <button className="ps-button ps-button-secondary" onClick={() => setCancelled(true)}>Cancel</button>}
      </div>}
      {target === null && <div className="ps-download-actions">
        <a className="ps-button ps-button-primary" href={WEB_APP}><Globe size={16} aria-hidden="true" />Open the web app</a>
      </div>}

      {installers && <div className="ps-download-others">
        <span>{target ? "Need a different version?" : "Installers"}</span>
        {(target ? TARGETS.filter(item => item !== target) : TARGETS).map(item => <a key={item} href={installers[item]} onClick={() => setCancelled(true)}>
          {item === "windows" ? <Monitor size={15} aria-hidden="true" /> : <Laptop size={15} aria-hidden="true" />}{LABELS[item]}
        </a>)}
      </div>}

      <div className="ps-download-help">
        <p><strong>First launch on Mac:</strong> open the downloaded file, drag ProtectSUS to Applications, then open it. If macOS can’t verify it, go to System Settings → Privacy &amp; Security and choose Open Anyway.</p>
        <p><strong>First launch on Windows:</strong> run the installer. If Windows protects your PC, choose More info → Run anyway.</p>
        <p>The desktop app keeps itself up to date. <a href={RELEASES}>All releases</a> · <a href={WEB_APP}>Use it in your browser</a></p>
      </div>
    </section>
  </main>;
}
