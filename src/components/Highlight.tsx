import type { ReactNode } from "react";
import { highlightRanges } from "@/lib/names";

export function Highlight({ text, query }: { text: string; query: string }) {
  const value = String(text || "");
  const ranges = highlightRanges(value, query);
  if (!ranges.length) return value;

  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) nodes.push(value.slice(cursor, start));
    nodes.push(<mark key={`${start}-${end}`}>{value.slice(start, end)}</mark>);
    cursor = end;
  }
  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}
