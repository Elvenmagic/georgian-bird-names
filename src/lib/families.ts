import type { Bird } from "./names";

export const NONE_FAMILY = "__none";

export type FamilyGroup = {
  key: string;
  title: string;
  scientific: string;
  georgian: boolean;
  birds: Bird[];
};

export function familyMeta(bird: Bird) {
  const scientific = String(bird.family || "").trim();
  const georgian = String(bird.familyKa || "").trim();
  if (!scientific && !georgian) {
    return { key: NONE_FAMILY, title: "ოჯახი უცნობია", scientific: "", georgian: false };
  }
  return {
    key: scientific || georgian,
    title: georgian || scientific,
    scientific: georgian ? scientific : "",
    georgian: Boolean(georgian),
  };
}

export function compareFamilies(
  a: Pick<FamilyGroup, "key" | "title" | "georgian">,
  b: Pick<FamilyGroup, "key" | "title" | "georgian">,
) {
  if (a.key === NONE_FAMILY) return 1;
  if (b.key === NONE_FAMILY) return -1;
  if (a.georgian !== b.georgian) return a.georgian ? -1 : 1;
  return a.title.localeCompare(b.title, a.georgian ? "ka" : "en");
}

export function groupFamilies(birds: Bird[]) {
  const groups = new Map<string, FamilyGroup>();
  for (const bird of birds) {
    const meta = familyMeta(bird);
    const group = groups.get(meta.key);
    if (group) group.birds.push(bird);
    else groups.set(meta.key, { ...meta, birds: [bird] });
  }
  return [...groups.values()].sort(compareFamilies);
}
