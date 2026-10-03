import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-24">
      <div className="mb-8 space-y-4">
        <Skeleton className="h-8 w-44 bg-muted" />
        <Skeleton className="h-4 w-72 bg-muted" />
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <Skeleton className="h-11 w-full max-w-md bg-muted" />
        <Skeleton className="h-11 w-full max-w-xs bg-muted" />
        <Skeleton className="h-11 w-full max-w-xs bg-muted" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-28 bg-muted" />
              <Skeleton className="h-6 w-16 bg-muted" />
            </div>
            <Skeleton className="mb-3 h-4 w-full bg-muted" />
            <Skeleton className="mb-3 h-4 w-5/6 bg-muted" />
            <Skeleton className="mb-5 h-4 w-4/6 bg-muted" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 bg-muted" />
              <Skeleton className="h-6 w-20 bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
