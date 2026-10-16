import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { BirdCard } from "@/components/BirdCard";
import type { Bird } from "@/lib/names";

function cardInView(rect: DOMRect) {
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
}

export const CardGrid = memo(function CardGrid({
  birds,
  visibleIds,
  query,
  animate,
  onOpen,
}: {
  birds: Bird[];
  visibleIds: Set<string>;
  query: string;
  animate: boolean;
  onOpen: () => void;
}) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const previous = useRef(new Map<string, DOMRect>());
  const ready = useRef(false);
  const shown = useMemo(
    () => birds.filter((bird) => visibleIds.has(bird.id)),
    [birds, visibleIds],
  );
  const signature = `${query}\n${shown.map((bird) => bird.id).join("\n")}`;
  const registerCard = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) refs.current.set(id, node);
    else refs.current.delete(id);
  }, []);

  useLayoutEffect(() => {
    if (!animate) {
      ready.current = false;
      previous.current = new Map();
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextFrames = new Map<string, DOMRect>();
    const maxTravel = window.innerHeight;

    for (const [id, card] of refs.current) {
      for (const animation of card.getAnimations()) {
        if (animation.id === "card-shuffle") animation.cancel();
      }
      if (card.classList.contains("is-hidden")) continue;
      const next = card.getBoundingClientRect();
      if (!cardInView(next)) continue;
      if (ready.current && !reduce) {
        const prev = previous.current.get(id);
        const dx = prev ? prev.left - next.left : 0;
        const dy = prev ? prev.top - next.top : 0;
        const settles = Boolean(prev) && Math.abs(dx) < maxTravel && Math.abs(dy) < maxTravel;
        if (!(settles && Math.abs(dx) < 1 && Math.abs(dy) < 1)) {
          const keyframes = settles
            ? [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }]
            : [
                { opacity: 0, transform: "translateY(10px)" },
                { opacity: 1, transform: "translateY(0)" },
              ];
          card.animate(keyframes, {
            duration: 220,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
            id: "card-shuffle",
          });
        }
      }
      nextFrames.set(id, next);
    }

    previous.current = nextFrames;
    ready.current = true;
  }, [animate, signature]);

  return (
    <div id="results" className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
      {shown.map((bird, index) => (
        <BirdCard
          key={bird.id}
          bird={bird}
          query={query}
          eager={index < 4}
          hidden={false}
          onOpen={onOpen}
          cardRef={registerCard}
        />
      ))}
    </div>
  );
});
