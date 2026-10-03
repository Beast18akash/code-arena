import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemLoading() {
  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 pt-24 pb-10 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="min-w-0 space-y-7">
        <header className="border-b border-border pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-64 bg-muted" />
            <Skeleton className="h-6 w-20 bg-muted" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-7 w-16 bg-muted" />
            <Skeleton className="h-7 w-20 bg-muted" />
            <Skeleton className="h-7 w-18 bg-muted" />
          </div>
        </header>

        <div className="space-y-3">
          <Skeleton className="h-6 w-32 bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-5/6 bg-muted" />
          <Skeleton className="h-4 w-4/6 bg-muted" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-6 w-28 bg-muted" />
          <div className="space-y-3">
            <div className="border border-border p-4">
              <Skeleton className="mb-3 h-5 w-20 bg-muted" />
              <Skeleton className="mb-2 h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-4/5 bg-muted" />
            </div>
            <div className="border border-border p-4">
              <Skeleton className="mb-3 h-5 w-20 bg-muted" />
              <Skeleton className="mb-2 h-4 w-full bg-muted" />
              <Skeleton className="h-4 w-3/5 bg-muted" />
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <Skeleton className="h-6 w-32 bg-muted" />
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-5/6 bg-muted" />
        </div>
      </section>

      <div className="min-w-0 border border-border bg-background">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <Skeleton className="h-10 w-40 bg-muted" />
          <Skeleton className="h-10 w-28 bg-muted" />
        </div>
        <div className="p-3">
          <div className="h-[min(68vh,720px)] w-full border border-border bg-slate-950">
            <div className="space-y-3 p-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-6 rounded-none bg-slate-800" />
                  <Skeleton
                    className={`h-4 rounded-none bg-slate-800 ${index % 3 === 0 ? "w-3/4" : index % 3 === 1 ? "w-2/3" : "w-1/2"}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
