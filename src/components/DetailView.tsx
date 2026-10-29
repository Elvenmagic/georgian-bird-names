import { useEffect, useState, type MouseEvent } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/CopyButton";
import { Highlight } from "@/components/Highlight";
import { EbirdIcon, WikipediaIcon } from "@/components/icons";
import type { Bird } from "@/lib/names";
import { photoSources } from "@/lib/photos";
import { iucnExplanations, iucnLabels, statusCodesOf, statusExplanations, statusText } from "@/lib/status";

export function DetailView({
  bird,
  query,
  listHref,
  onBack,
}: {
  bird: Bird;
  query: string;
  listHref: string;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const georgian = bird.georgian?.primary || "";
  const heading = georgian || bird.names.en || "—";
  const aliases = bird.georgian?.aliases || [];

  return (
    <article className="space-y-6">
      <Button asChild variant="ghost" className="-ml-2">
        <a href={listHref} onClick={onBack}>
          <ArrowLeft />
          სიაში დაბრუნება
        </a>
      </Button>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <figure className="space-y-2">
          <Card className="overflow-hidden py-0">
            <DetailPhoto bird={bird} />
          </Card>
          <PhotoCredit photo={bird.photo} />
        </figure>
        <div className="space-y-3">
          <div className="flex items-start gap-1">
            <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
            <CopyButton
              value={georgian || bird.names.en || ""}
              label={georgian ? "ქართული სახელის კოპირება" : "ინგლისური სახელის კოპირება"}
            />
          </div>
          {aliases.length > 0 && (
            <p className="text-muted-foreground text-sm">
              ასევე:{" "}
              {aliases.map((name, index) => (
                <span key={name}>
                  {index > 0 ? ", " : null}
                  <Highlight text={name} query={query} />
                </span>
              ))}
            </p>
          )}
          {georgian ? (
            <p className="flex items-center gap-1 text-base">
              <span>{bird.names.en || ""}</span>
              <CopyButton value={bird.names.en || ""} label="ინგლისური სახელის კოპირება" />
            </p>
          ) : null}
          <p className="text-muted-foreground flex items-center gap-1 italic">
            <span>{bird.names.la || ""}</span>
            <CopyButton value={bird.names.la || ""} label="ლათინური სახელის კოპირება" />
          </p>
          <Separator />
          <Presence bird={bird} />
          <DetailLinks bird={bird} />
        </div>
      </div>
    </article>
  );
}

function DetailPhoto({ bird }: { bird: Bird }) {
  const source = bird.photo?.url;
  if (!source) {
    return (
      <div className="bg-muted text-muted-foreground grid aspect-[4/3] place-items-center text-sm" aria-hidden="true">
        ფოტო არ არის
      </div>
    );
  }
  const image = photoSources(source, [330, 500, 800]);
  const alt = bird.names.en || bird.names.ka || "";
  return (
    <img
      className="bg-muted block h-auto w-full"
      src={image.src}
      srcSet={image.srcset}
      sizes="(max-width: 840px) 92vw, 42vw"
      alt={alt}
      decoding="async"
      onError={(event) => {
        const img = event.currentTarget;
        img.onerror = null;
        img.removeAttribute("srcset");
        img.src = source;
      }}
    />
  );
}

function PhotoCredit({ photo }: { photo: Bird["photo"] }) {
  if (!photo) return null;
  const parts = [photo.credit, photo.license].filter(Boolean).join(", ");
  if (!parts) return null;
  if (photo.source) {
    return (
      <p className="text-muted-foreground text-xs">
        <a className="underline-offset-4 hover:underline" href={photo.source} target="_blank" rel="noreferrer">
          {parts}
        </a>
      </p>
    );
  }
  return <p className="text-muted-foreground text-xs">{parts}</p>;
}

function useCoarsePointer() {
  const query = "(hover: none), (pointer: coarse)";
  const [coarse, setCoarse] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCoarse(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return coarse;
}

function TipNotes({ notes }: { notes: { code: string; text: string }[] }) {
  return notes.map((note) => (
    <p key={note.code}>
      <span className="font-semibold">{note.code}</span> {note.text}
    </p>
  ));
}

function Tip({ label, notes }: { label: string; notes: { code: string; text: string }[] }) {
  const coarse = useCoarsePointer();
  if (!notes.length) return null;
  const trigger = (
    <Button type="button" variant="ghost" size="icon-xs" aria-label={label}>
      <Info />
    </Button>
  );
  if (coarse) {
    return (
      <Popover>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          className="w-fit max-w-xs space-y-2 border-0 bg-foreground px-3 py-2 text-left text-xs text-background shadow-md"
          side="bottom"
          align="start"
        >
          <TipNotes notes={notes} />
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-2 px-3 py-2 text-left" side="bottom" align="start">
        <TipNotes notes={notes} />
      </TooltipContent>
    </Tooltip>
  );
}

function Presence({ bird }: { bird: Bird }) {
  const statusNotes = statusCodesOf(bird)
    .filter((code) => statusExplanations[code])
    .map((code) => ({ code, text: statusExplanations[code] }));
  const iucn = String(bird.iucn || "").trim();
  const iucnName = iucnLabels[iucn] || "";
  const iucnNotes = iucnExplanations[iucn] ? [{ code: iucn, text: iucnExplanations[iucn] }] : [];
  const rows = [
    statusText(bird)
      ? {
          label: "საქართველოში",
          value: <span>{statusText(bird)}</span>,
          tip: <Tip label="სტატუსის ახსნა" notes={statusNotes} />,
        }
      : null,
    iucn
      ? {
          label: "წითელი ნუსხა",
          value: (
            <span className="inline-flex items-center gap-2">
              <Badge className={`iucn iucn-${iucn.toLowerCase()}`}>{iucn}</Badge>
              {iucnName}
            </span>
          ),
          tip: <Tip label="კატეგორიის ახსნა" notes={iucnNotes} />,
        }
      : null,
    bird.orderKa || bird.order
      ? { label: "რიგი", value: <span>{bird.orderKa || bird.order}</span>, tip: null }
      : null,
    bird.familyKa || bird.family
      ? { label: "ოჯახი", value: <span>{bird.familyKa || bird.family}</span>, tip: null }
      : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (!rows.length) return null;
  return (
    <dl className="grid gap-4">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
            <span>{row.label}</span>
            {row.tip}
          </dt>
          <dd className="mt-1 text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailLinks({ bird }: { bird: Bird }) {
  const items = [
    ["eBird", bird.links?.ebird, "ebird"],
    ["Wikipedia", bird.links?.wikipedia, "wikipedia"],
    ["ქართული ვიკიპედია", bird.links?.wikipediaKa, "wikipedia"],
  ].filter((item): item is [string, string, string] => Boolean(item[1]));
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {items.map(([label, url, icon]) => (
        <Button key={label} asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            {icon === "ebird" ? <EbirdIcon /> : <WikipediaIcon />}
            {label}
          </a>
        </Button>
      ))}
    </div>
  );
}
