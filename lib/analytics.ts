"use client";

type AnalyticsEvent = {
  name: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
  path: string;
  at: string;
};

const queueKey = "codex-skills-analytics";

function store(event: AnalyticsEvent) {
  try {
    const existing = JSON.parse(window.localStorage.getItem(queueKey) || "[]") as AnalyticsEvent[];
    window.localStorage.setItem(queueKey, JSON.stringify([...existing, event].slice(-120)));
  } catch {
    // Analytics must never affect the product experience.
  }
}

function send(event: AnalyticsEvent) {
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  if (!endpoint) return;
  const body = JSON.stringify(event);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    return;
  }
  fetch(endpoint, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
}

export function track(name: string, payload?: AnalyticsEvent["payload"]) {
  if (typeof window === "undefined") return;
  const event: AnalyticsEvent = {
    name,
    payload,
    path: window.location.pathname + window.location.search,
    at: new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent("codex-skills-analytics", { detail: event }));
  store(event);
  send(event);
}
