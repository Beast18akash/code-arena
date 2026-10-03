import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-24">
      <div className="mb-8 rounded-none border border-border bg-card p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 bg-muted" />
              <Skeleton className="h-4 w-24 bg-muted" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border border-border bg-card p-5">
            <Skeleton className="mb-3 h-4 w-24 bg-muted" />
            <Skeleton className="mb-2 h-8 w-20 bg-muted" />
            <Skeleton className="h-3 w-20 bg-muted" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-none border border-border bg-card p-5">
          <Skeleton className="h-6 w-44 bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-none last:pb-0">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-muted" />
                  <Skeleton className="h-3 w-28 bg-muted" />
                </div>
                <Skeleton className="h-6 w-20 bg-muted" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6 rounded-none border border-border bg-card p-5">
          <Skeleton className="h-6 w-40 bg-muted" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Skeleton className="h-3 w-20 bg-muted" />
                  <Skeleton className="h-3 w-8 bg-muted" />
                </div>
                <Skeleton className="h-2.5 w-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
