import type { MouseEvent } from "react";

export type AnchorClick = (event: MouseEvent<HTMLAnchorElement>) => void;

export function isPlainClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function birdPath(id: string) {
  return `${import.meta.env.BASE_URL}bird/${encodeURIComponent(id)}/`;
}

export function birdIdFromPath(pathname: string) {
  const base = import.meta.env.BASE_URL;
  if (!pathname.startsWith(base)) return "";
  const rest = pathname.slice(base.length);
  const match = rest.match(/^bird\/([^/]+)\/?$/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

export function birdIdFromHash(hash: string) {
  if (!hash || hash === "#") return "";
  try {
    return decodeURIComponent(hash.replace(/^#/, "")).trim();
  } catch {
    return "";
  }
}

export function catalogPath(route: {
  query: string;
  letter: string;
  view: string;
  grouped: boolean;
}) {
  const params = new URLSearchParams();
  if (route.query.trim()) params.set("q", route.query);
  if (route.letter) params.set("letter", route.letter);
  if (route.view === "list") params.set("view", "list");
  if (route.grouped) params.set("families", "1");
  const search = params.toString();
  return `${import.meta.env.BASE_URL}${search ? `?${search}` : ""}`;
}
