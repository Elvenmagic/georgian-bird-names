import logoUrl from "@/assets/logo.svg";

export function SiteHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 min-[840px]:flex-row min-[840px]:items-center min-[840px]:justify-between min-[840px]:gap-6">
        <div
          aria-hidden="true"
          className="bg-primary size-[4.5rem] shrink-0 min-[840px]:order-last min-[840px]:size-[7.25rem]"
          style={{
            WebkitMask: `url("${logoUrl}") center / contain no-repeat`,
            mask: `url("${logoUrl}") center / contain no-repeat`,
          }}
        />
        <div className="min-w-0 space-y-2">
          <p className="text-primary font-sans text-xs font-semibold tracking-[0.16em] uppercase">
            Nomenclature
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            ფრინველთა ქართული სახელები
          </h1>
          <p className="text-muted-foreground max-w-xl text-base">
            მოძებნე ფრინველი ქართული, ინგლისური ან ლათინური სახელით.
          </p>
        </div>
      </div>
    </header>
  );
}
