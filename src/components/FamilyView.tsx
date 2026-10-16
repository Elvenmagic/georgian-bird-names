import { memo } from "react";
import { BirdCard } from "@/components/BirdCard";
import { NameList } from "@/components/NameList";
import type { ViewMode } from "@/components/ListTools";
import type { FamilyGroup } from "@/lib/families";

export const FamilyView = memo(function FamilyView({
  view,
  groups,
  visibleIds,
  query,
  onOpen,
}: {
  view: ViewMode;
  groups: FamilyGroup[];
  visibleIds: Set<string>;
  query: string;
  onOpen: () => void;
}) {
  return (
    <div className="space-y-10">
      {groups.map((group) => {
        if (!group.birds.some((bird) => visibleIds.has(bird.id))) return null;
        return (
          <section key={group.key} className="family-section" data-family={group.key}>
            <div className="family-heading scroll-mt-[calc(var(--tools-height,0px)+0.75rem)]">
              <h2 className="text-xl font-semibold tracking-tight">{group.title}</h2>
              {group.scientific ? (
                <p className="text-muted-foreground text-sm italic">{group.scientific}</p>
              ) : null}
            </div>
            {view === "list" ? (
              <div className="mt-4">
                <NameList birds={group.birds} visibleIds={visibleIds} query={query} onOpen={onOpen} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
                {group.birds.map((bird) =>
                  visibleIds.has(bird.id) ? (
                    <BirdCard
                      key={bird.id}
                      bird={bird}
                      query={query}
                      eager={false}
                      hidden={false}
                      onOpen={onOpen}
                    />
                  ) : null,
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
});
