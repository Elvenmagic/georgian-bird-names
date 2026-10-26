import { useEffect, useRef, useState } from "react";
import { CaseSensitive, ChevronDown, Filter, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FamilyGroup } from "@/lib/families";
import { normalize } from "@/lib/names";

export type ViewMode = "cards" | "list";

export function ListTools({
  hidden,
  query,
  onQuery,
  shown,
  total,
  view,
  onView,
  grouped,
  onGrouped,
  letters,
  letter,
  availableLetters,
  onLetter,
  families,
  visibleFamilyKeys,
  activeFamily,
  onFamily,
}: {
  hidden: boolean;
  query: string;
  onQuery: (value: string) => void;
  shown: number;
  total: number;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  grouped: boolean;
  onGrouped: (grouped: boolean) => void;
  letters: string[];
  letter: string;
  availableLetters: Set<string>;
  onLetter: (letter: string, clearing: boolean) => void;
  families: FamilyGroup[];
  visibleFamilyKeys: Set<string>;
  activeFamily: string;
  onFamily: (key: string) => void;
}) {
  const [alphabetOpen, setAlphabetOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [familyQuery, setFamilyQuery] = useState("");
  const toolsRef = useRef<HTMLDivElement>(null);
  const familyNavRef = useRef<HTMLElement>(null);
  const activeTitle = families.find((group) => group.key === activeFamily)?.title || "ოჯახები";
  const alphabetLabel = letter ? `ანბანი, ${letter}` : "ანბანი";

  useEffect(() => {
    if (!grouped) {
      setFamilyOpen(false);
      setFamilyQuery("");
    }
  }, [grouped]);

  function chooseLetter(next: string, clearing: boolean) {
    onLetter(next, clearing);
    setAlphabetOpen(false);
  }

  function chooseFamily(key: string) {
    onFamily(key);
    setFamilyOpen(false);
    setFamilyQuery("");
  }

  function onFamilyOpen(open: boolean) {
    setFamilyOpen(open);
    if (!open) setFamilyQuery("");
  }

  const normalizedFamilyQuery = normalize(familyQuery);
  const familyOptions = families.filter((group) => {
    if (!visibleFamilyKeys.has(group.key)) return false;
    if (!normalizedFamilyQuery) return true;
    const haystack = normalize(`${group.title} ${group.scientific}`);
    return normalizedFamilyQuery.split(/\s+/).every((part) => haystack.includes(part));
  });

  useEffect(() => {
    const el = toolsRef.current;
    if (!el) return;
    const applyHeight = () => {
      const height = el.hidden ? 0 : el.offsetHeight;
      document.documentElement.style.setProperty("--tools-height", `${height}px`);
    };
    applyHeight();
    const resize = new ResizeObserver(applyHeight);
    resize.observe(el);
    if (hidden) {
      el.classList.remove("is-stuck");
      return () => resize.disconnect();
    }
    const stuck = new IntersectionObserver(
      ([entry]) => {
        if (el.hidden) {
          el.classList.remove("is-stuck");
          return;
        }
        el.classList.toggle("is-stuck", entry.intersectionRatio < 1);
      },
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" },
    );
    stuck.observe(el);
    return () => {
      resize.disconnect();
      stuck.disconnect();
    };
  }, [hidden, view, grouped]);

  useEffect(() => {
    if (!familyOpen) return;
    const nav = familyNavRef.current;
    const frame = window.requestAnimationFrame(() => {
      const button = nav?.querySelector<HTMLElement>("button.is-active");
      if (!nav || !button) return;
      const navRect = nav.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      if (rect.top < navRect.top) nav.scrollTop -= navRect.top - rect.top;
      else if (rect.bottom > navRect.bottom) nav.scrollTop += rect.bottom - navRect.bottom;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [familyOpen, activeFamily]);

  return (
    <div
      id="list-tools"
      ref={toolsRef}
      hidden={hidden}
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 border-b backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6">
        <label className="relative block">
          <span className="sr-only">ძებნა</span>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            id="q"
            type="search"
            className="pl-9"
            placeholder="გულწითელა, robin, Erithacus…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {shown === total ? `${shown} ფრინველი` : `${shown} შედეგი / ${total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={view}
              variant="outline"
              size="sm"
              onValueChange={(next) => {
                if (next === "cards" || next === "list") onView(next);
              }}
              aria-label="ხედი"
              spacing={0}
            >
              <ToggleGroupItem value="cards" aria-label="ბარათები" title="ბარათები">
                <LayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="სია" title="სია">
                <List />
              </ToggleGroupItem>
            </ToggleGroup>
            <Toggle
              variant="outline"
              size="sm"
              pressed={grouped}
              onPressedChange={onGrouped}
              aria-label="ოჯახები"
              title="ოჯახები"
            >
              <Filter />
            </Toggle>
            <Popover open={alphabetOpen} onOpenChange={setAlphabetOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={letter ? "secondary" : "outline"}
                  size="sm"
                  aria-label={alphabetLabel}
                  title={alphabetLabel}
                >
                  <CaseSensitive />
                  {letter || "ანბანი"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-2"
                align="end"
                sideOffset={8}
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                <nav className="grid grid-cols-6 gap-1" aria-label="ანბანი">
                  <AlphabetButtons
                    letters={letters}
                    letter={letter}
                    availableLetters={availableLetters}
                    onLetter={chooseLetter}
                  />
                </nav>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div hidden={!grouped}>
          <Popover open={familyOpen} onOpenChange={onFamilyOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="group w-full justify-between sm:w-80" aria-label={activeTitle}>
                <span className="truncate">{activeTitle}</span>
                <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-1"
              align="start"
              sideOffset={8}
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <label className="relative mb-1 block">
                <span className="sr-only">ოჯახის ძებნა</span>
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  type="search"
                  value={familyQuery}
                  onChange={(event) => setFamilyQuery(event.target.value)}
                  placeholder="ოჯახის სახელი…"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-8 pl-8 text-sm"
                />
              </label>
              <nav ref={familyNavRef} className="flex max-h-72 flex-col gap-0.5 overflow-auto" aria-label="ოჯახები">
                {familyOptions.map((group) => {
                  const active = group.key === activeFamily;
                  return (
                    <Button
                      key={group.key}
                      type="button"
                      variant={active ? "secondary" : "ghost"}
                      className={
                        active
                          ? "is-active h-auto justify-start px-2 py-1.5 text-start whitespace-normal"
                          : "h-auto justify-start px-2 py-1.5 text-start whitespace-normal"
                      }
                      aria-current={active ? "true" : undefined}
                      onClick={() => chooseFamily(group.key)}
                    >
                      {group.title}
                    </Button>
                  );
                })}
                {familyOptions.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-3 text-center text-sm">ოჯახი ვერ მოიძებნა.</p>
                ) : null}
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

function AlphabetButtons({
  letters,
  letter,
  availableLetters,
  onLetter,
}: {
  letters: string[];
  letter: string;
  availableLetters: Set<string>;
  onLetter: (letter: string, clearing: boolean) => void;
}) {
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={letter ? "ghost" : "secondary"}
        data-all=""
        className="col-span-3"
        aria-pressed={!letter}
        onClick={() => onLetter("", true)}
      >
        ყველა
      </Button>
      {letters.map((item) => {
        const active = item === letter;
        return (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={active ? "secondary" : "ghost"}
            data-letter={item}
            disabled={!active && !availableLetters.has(item)}
            className="min-w-8 px-2 font-semibold"
            aria-pressed={active}
            onClick={() => onLetter(item, false)}
          >
            {item}
          </Button>
        );
      })}
    </>
  );
}
