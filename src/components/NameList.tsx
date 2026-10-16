import { memo } from "react";
import { Separator } from "@/components/ui/separator";
import { Highlight } from "@/components/Highlight";
import { firstLetter, type Bird } from "@/lib/names";

export const NameList = memo(function NameList({
  birds,
  visibleIds,
  query,
  onOpen,
}: {
  birds: Bird[];
  visibleIds: Set<string>;
  query: string;
  onOpen: () => void;
}) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      {birds
        .filter((bird) => visibleIds.has(bird.id))
        .map((bird) => (
          <NameRow key={bird.id} bird={bird} query={query} onOpen={onOpen} />
        ))}
    </div>
  );
});

const NameRow = memo(function NameRow({
  bird,
  query,
  onOpen,
}: {
  bird: Bird;
  query: string;
  onOpen: () => void;
}) {
  const aliases = bird.georgian?.aliases || [];
  return (
    <div>
      <a
        className="hover:bg-muted/60 grid gap-0.5 px-4 py-3 text-inherit no-underline sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-4"
        href={`#${bird.id}`}
        data-id={bird.id}
        data-letter={firstLetter(bird)}
        onClick={onOpen}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">
            <Highlight text={bird.georgian?.primary || "—"} query={query} />
          </span>
          {aliases.length > 0 && (
            <span className="text-muted-foreground text-sm">
              ასევე:{" "}
              {aliases.map((name, index) => (
                <span key={name}>
                  {index > 0 ? ", " : null}
                  <Highlight text={name} query={query} />
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="text-sm">
          <Highlight text={bird.names.en || ""} query={query} />
        </span>
        <span className="text-muted-foreground text-sm italic">
          <Highlight text={bird.names.la || ""} query={query} />
        </span>
      </a>
      <Separator />
    </div>
  );
});
