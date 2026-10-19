// Anonymous page-view count for the owner dashboard: no cookies, no identifiers, nothing stored in the browser.
const VISIT_URL = "https://91rwr78g0c.execute-api.us-east-1.amazonaws.com/api/visit";

export function recordVisit(site: "landing" | "download") {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    const body = JSON.stringify({ site, path: location.pathname });
    // text/plain keeps this a simple request, so no CORS preflight is needed.
    const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
    if (!navigator.sendBeacon?.(VISIT_URL, blob))
      void fetch(VISIT_URL, { method: "POST", body, keepalive: true, mode: "no-cors", headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(() => {});
  } catch { /* counting must never affect the page */ }
}
