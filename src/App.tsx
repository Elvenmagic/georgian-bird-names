import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CardGrid } from "@/components/CardGrid";
import { DetailView } from "@/components/DetailView";
import { FamilyView } from "@/components/FamilyView";
import { ListTools, type ViewMode } from "@/components/ListTools";
import { NameList } from "@/components/NameList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { birds } from "@/lib/birds";
import { groupFamilies } from "@/lib/families";
import { firstLetter, isVisible, matches, normalize, type Bird } from "@/lib/names";
import {
  birdIdFromHash,
  birdIdFromPath,
  birdPath,
  catalogPath,
  isPlainClick,
  type AnchorClick,
} from "@/lib/route";

const SITE_TITLE = "ფრინველთა ქართული სახელები";

function pageTitle(detail: Bird | null) {
  if (!detail) return SITE_TITLE;
  const name = detail.georgian?.primary || detail.names.en;
  return name ? `${name} — ${SITE_TITLE}` : SITE_TITLE;
}

function setMetaContent(selector: string, attribute: "property" | "name", key: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(selector);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function knownBirdId(id: string) {
  if (!id) return "";
  return birds.some((bird) => bird.id === id) ? id : "";
}

function birdIdFromLocation() {
  return knownBirdId(birdIdFromPath(location.pathname)) || knownBirdId(birdIdFromHash(location.hash));
}

function readRoute() {
  const params = new URLSearchParams(location.search);
  const view = params.get("view");
  return {
    query: params.get("q") || "",
    letter: params.get("letter") || "",
    view: (view === "list" ? "list" : "cards") as ViewMode,
    grouped: view === "families" || params.get("families") === "1",
  };
}

function currentFamilyKey(tools: HTMLElement) {
  const toolsBottom = tools.getBoundingClientRect().bottom;
  const sections = [...document.querySelectorAll<HTMLElement>(".family-section")].filter(
    (section) => !section.hidden,
  );
  if (!sections.length) return "";
  let current = sections[0];
  for (const section of sections) {
    const heading = section.querySelector<HTMLElement>(".family-heading") || section;
    const line = toolsBottom + heading.offsetHeight + 12;
    if (heading.getBoundingClientRect().top <= line + 1) current = section;
    else break;
  }
  const atBottom =
    window.scrollY > 0 &&
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  if (atBottom) {
    const last = sections[sections.length - 1];
    if (last.getBoundingClientRect().top < window.innerHeight) current = last;
  }
  return current.dataset.family || "";
}

export function App() {
  const initial = useMemo(readRoute, []);
  const [query, setQuery] = useState(initial.query);
  const [letter, setLetter] = useState(initial.letter);
  const [view, setView] = useState<ViewMode>(initial.view);
  const [grouped, setGrouped] = useState(initial.grouped);
  const [birdId, setBirdId] = useState(birdIdFromLocation);
  const [activeFamily, setActiveFamily] = useState("");
  const deferredQuery = useDeferredValue(query);
  const listScroll = useRef(0);
  const previousDetail = useRef<string | null>(null);
  const birdIdRef = useRef(birdId);
  birdIdRef.current = birdId;

  const letters = useMemo(
    () =>
      [...new Set(birds.map(firstLetter).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ka")),
    [],
  );
  const families = useMemo(() => groupFamilies(birds), []);
  const normalizedQuery = normalize(deferredQuery);

  const visibleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const bird of birds) {
      if (isVisible(bird, deferredQuery, letter)) ids.add(bird.id);
    }
    return ids;
  }, [deferredQuery, letter]);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const bird of birds) {
      if (!matches(bird, normalizedQuery)) continue;
      const item = firstLetter(bird);
      if (item) set.add(item);
    }
    return set;
  }, [normalizedQuery]);

  const visibleFamilyKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const group of families) {
      if (group.birds.some((bird) => visibleIds.has(bird.id))) keys.add(group.key);
    }
    return keys;
  }, [families, visibleIds]);

  const detail = useMemo(() => {
    if (!birdId) return null;
    return birds.find((bird) => bird.id === birdId) || null;
  }, [birdId]);

  const listHref = catalogPath({ query, letter, view, grouped });

  useEffect(() => {
    const next = birdId ? birdPath(birdId) : listHref;
    const current = `${location.pathname}${location.search}${location.hash}`;
    if (next === current) return;
    history.replaceState(null, "", next);
  }, [birdId, listHref]);

  useEffect(() => {
    const onPop = () => {
      const pathId = knownBirdId(birdIdFromPath(location.pathname));
      const hashId = knownBirdId(birdIdFromHash(location.hash));
      const nextId = pathId || hashId;
      if (nextId && !birdIdRef.current) listScroll.current = window.scrollY;
      if (!pathId && hashId) {
        history.replaceState(null, "", birdPath(hashId));
        setBirdId(hashId);
        return;
      }
      if (pathId) {
        setBirdId(pathId);
        return;
      }
      const route = readRoute();
      setQuery(route.query);
      setLetter(route.letter);
      setView(route.view);
      setGrouped(route.grouped);
      setBirdId("");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const title = pageTitle(detail);
    document.title = title;
    setMetaContent('meta[property="og:title"]', "property", "og:title", title);
    setMetaContent('meta[name="twitter:title"]', "name", "twitter:title", title);
  }, [detail]);

  useLayoutEffect(() => {
    const id = detail?.id ?? null;
    if (id) {
      if (previousDetail.current !== id) window.scrollTo(0, 0);
    } else if (previousDetail.current) {
      const top = listScroll.current;
      window.scrollTo(0, top);
      window.requestAnimationFrame(() => window.scrollTo(0, top));
    }
    previousDetail.current = id;
  }, [detail]);

  useEffect(() => {
    if (!grouped || detail) return;
    const tools = document.getElementById("list-tools");
    if (!tools) return;

    const update = () => {
      if (tools.hidden) return;
      setActiveFamily(currentFamilyKey(tools));
    };

    const offset = tools.offsetHeight + 12;
    document.documentElement.style.setProperty("--tools-height", `${tools.offsetHeight}px`);
    const sections = [...document.querySelectorAll<HTMLElement>(".family-section")].filter(
      (section) => !section.hidden,
    );
    const observer = new IntersectionObserver(() => update(), {
      rootMargin: `-${offset}px 0px -55% 0px`,
      threshold: [0, 1],
    });
    for (const section of sections) observer.observe(section);
    update();

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        update();
      });
    };
    const onResize = () => {
      document.documentElement.style.setProperty("--tools-height", `${tools.offsetHeight}px`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [grouped, view, detail, deferredQuery, letter]);

  const onOpen = useCallback<AnchorClick>((event) => {
    if (!isPlainClick(event)) return;
    const id = knownBirdId(birdIdFromPath(new URL(event.currentTarget.href).pathname));
    if (!id) return;
    event.preventDefault();
    listScroll.current = window.scrollY;
    history.pushState(null, "", birdPath(id));
    setBirdId(id);
  }, []);

  const onBack = useCallback<AnchorClick>((event) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    const href = event.currentTarget.getAttribute("href") || import.meta.env.BASE_URL;
    history.pushState(null, "", href);
    setBirdId("");
  }, []);

  function goHome() {
    listScroll.current = 0;
    setQuery("");
    setLetter("");
    setView("cards");
    setGrouped(false);
    setBirdId("");
    const next = import.meta.env.BASE_URL;
    if (`${location.pathname}${location.search}${location.hash}` !== next) {
      history.pushState(null, "", next);
    }
    window.scrollTo(0, 0);
  }

  function revealList() {
    const tools = document.getElementById("list-tools");
    const list = document.getElementById("list-view");
    if (!tools || !list) return;
    const toolsBottom = tools.getBoundingClientRect().bottom;
    const listTop = list.getBoundingClientRect().top;
    if (listTop >= toolsBottom - 1) return;
    const top = window.scrollY + listTop - tools.offsetHeight - 12;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }

  function onLetter(nextLetter: string, clearing: boolean) {
    const next = clearing || letter === nextLetter ? "" : nextLetter;
    if (next !== letter) {
      setLetter(next);
      revealList();
    }
  }

  function scrollToFamily(key: string) {
    const section = document.querySelector<HTMLElement>(
      `.family-section[data-family="${CSS.escape(key)}"]`,
    );
    if (!section || section.hidden) return;
    const heading = section.querySelector<HTMLElement>(".family-heading") || section;
    const tools = document.getElementById("list-tools");
    const offset = (tools?.offsetHeight ?? 0) + 12;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = window.scrollY + heading.getBoundingClientRect().top - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col">
      <SiteHeader onHome={goHome} />
      <ListTools
        hidden={Boolean(detail)}
        query={query}
        onQuery={setQuery}
        shown={visibleIds.size}
        total={birds.length}
        view={view}
        onView={setView}
        grouped={grouped}
        onGrouped={setGrouped}
        letters={letters}
        letter={letter}
        availableLetters={availableLetters}
        onLetter={onLetter}
        families={families}
        visibleFamilyKeys={visibleFamilyKeys}
        activeFamily={visibleFamilyKeys.has(activeFamily) ? activeFamily : ""}
        onFamily={(key) => {
          setActiveFamily(key);
          scrollToFamily(key);
        }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div id="list-view" hidden={Boolean(detail)}>
          {view === "cards" && !grouped ? (
            <CardGrid
              birds={birds}
              visibleIds={visibleIds}
              query={deferredQuery}
              animate={!detail && !deferredQuery}
              onOpen={onOpen}
            />
          ) : null}
          {view === "list" && !grouped ? (
            <NameList birds={birds} visibleIds={visibleIds} query={deferredQuery} onOpen={onOpen} />
          ) : null}
          {grouped ? (
            <FamilyView
              view={view}
              groups={families}
              visibleIds={visibleIds}
              query={deferredQuery}
              onOpen={onOpen}
            />
          ) : null}
          {visibleIds.size === 0 ? (
            <p className="text-muted-foreground py-16 text-center">ამ ეტაპზე ფრინველი ბაზაში არ მოიძებნა.</p>
          ) : null}
        </div>
        {detail ? (
          <DetailView bird={detail} query={deferredQuery} listHref={listHref} onBack={onBack} />
        ) : null}
      </main>
      <SiteFooter />
      </div>
    </TooltipProvider>
  );
}
