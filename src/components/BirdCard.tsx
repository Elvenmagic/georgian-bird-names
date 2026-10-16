import { memo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Highlight } from "@/components/Highlight";
import { firstLetter, type Bird } from "@/lib/names";
import { photoSources } from "@/lib/photos";
import { taxonParts } from "@/lib/status";

export const BirdCard = memo(function BirdCard({
  bird,
  query,
  eager,
  hidden,
  onOpen,
  cardRef,
}: {
  bird: Bird;
  query: string;
  eager: boolean;
  hidden: boolean;
  onOpen: () => void;
  cardRef?: (id: string, node: HTMLDivElement | null) => void;
}) {
  const aliases = bird.georgian?.aliases || [];
  const taxon = taxonParts(bird).join(" · ");
  const photoUrl = bird.photo?.thumb || bird.photo?.url;
  const ref = useCallback(
    (node: HTMLDivElement | null) => cardRef?.(bird.id, node),
    [bird.id, cardRef],
  );

  return (
    <Card
      ref={ref}
      className={
        hidden
          ? "is-hidden gap-0 overflow-hidden py-0"
          : "gap-0 overflow-hidden py-0 transition-shadow [content-visibility:auto] [contain-intrinsic-size:auto_21rem] hover:shadow-md"
      }
      data-id={bird.id}
      data-letter={firstLetter(bird)}
    >
      <a className="block text-inherit no-underline" href={`#${bird.id}`} onClick={onOpen}>
        {photoUrl ? (
          <BirdPhoto url={photoUrl} eager={eager} />
        ) : (
          <div className="bg-muted text-muted-foreground grid aspect-[4/3] place-items-center text-sm" aria-hidden="true">
            ფოტო არ არის
          </div>
        )}
        <CardHeader className="gap-1 px-4 pt-4 pb-0">
          <CardTitle className="text-base leading-snug">
            <Highlight text={bird.georgian?.primary || "—"} query={query} />
          </CardTitle>
          {aliases.length > 0 && (
            <CardDescription>
              ასევე:{" "}
              {aliases.map((name, index) => (
                <span key={name}>
                  {index > 0 ? ", " : null}
                  <Highlight text={name} query={query} />
                </span>
              ))}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-1 px-4 pt-2 pb-4">
          <p className="text-sm">
            <Highlight text={bird.names.en || ""} query={query} />
          </p>
          <p className="text-muted-foreground text-sm italic">
            <Highlight text={bird.names.la || ""} query={query} />
          </p>
          {taxon ? <p className="text-muted-foreground text-xs">{taxon}</p> : null}
        </CardContent>
      </a>
    </Card>
  );
});

function BirdPhoto({ url, eager }: { url: string; eager: boolean }) {
  const image = photoSources(url, [250, 330, 500]);
  return (
    <img
      className="bg-muted aspect-[4/3] w-full object-cover"
      src={image.src}
      srcSet={image.srcset}
      sizes="(max-width: 600px) 92vw, 250px"
      width={330}
      height={248}
      alt=""
      decoding="async"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "low"}
    />
  );
}
