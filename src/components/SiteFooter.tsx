import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <Separator />
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-2xl">
          ქართული სახელები — ილიას სახელმწიფო უნივერსიტეტის / Biodiversity Georgia ნუსხა.
          ინგლისური და ლათინური სახელები — eBird/Clements, სადაც ემთხვევა. ფოტოები —
          Wikimedia Commons, თითოეულ ჩანაწერზე მითითებული ავტორითა და ლიცენზიით.
        </p>
        <p className="shrink-0">Powered by Order of Kestrel</p>
      </div>
    </footer>
  );
}
