import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

export function CodeArenaExecutionIndicator({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-none border border-border bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground",
        className
      )}
    >
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-sm bg-amber-500 shadow-[0_0_0_1px_rgba(245,158,11,0.3)] animate-pulse" />
        <span className="h-2 w-2 rounded-sm bg-amber-500/70 animate-pulse [animation-delay:120ms]" />
        <span className="h-2 w-2 rounded-sm bg-amber-500/50 animate-pulse [animation-delay:240ms]" />
      </span>
      <span className="font-mono text-[10px] tracking-[0.18em] text-foreground">{label}</span>
      <span className="inline-block h-3.5 w-[6px] animate-pulse bg-amber-400 align-middle" />
    </div>
  );
}

export function CodeEditorPlaceholder({
  height = "min(68vh, 720px)",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-border bg-slate-950 text-slate-50",
        className
      )}
      style={{ height }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-300">
        <span>editor</span>
        <span className="text-slate-500">loading</span>
      </div>

      <div className="space-y-3 p-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-4 w-6 rounded-none bg-slate-800" />
            <Skeleton
              className={cn(
                "h-4 rounded-none bg-slate-800",
                index % 3 === 0 ? "w-3/4" : index % 3 === 1 ? "w-2/3" : "w-1/2"
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
