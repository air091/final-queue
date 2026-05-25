import { LoaderCircle } from "lucide-react";

type LoadingStateProps = {
  title?: string;
  message?: string;
  variant?: "page" | "content" | "inline";
  className?: string;
  showSkeleton?: boolean;
};

export default function LoadingState({
  title = "Loading",
  message = "Getting things ready...",
  variant = "content",
  className = "",
  showSkeleton = true,
}: LoadingStateProps) {
  const isPage = variant === "page";
  const isInline = variant === "inline";

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={[
        "flex w-full items-center justify-center px-4",
        isPage
          ? "min-h-screen bg-gradient-to-br from-white via-orange-50 to-white"
          : "",
        isInline ? "py-6" : "min-h-[320px] py-10",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "w-full rounded-3xl border border-orange-100 bg-white/95 shadow-sm",
          isInline ? "max-w-sm p-4" : "max-w-md p-6",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LoaderCircle className="animate-spin" size={24} />
          </div>

          <div>
            <p className="text-sm font-semibold text-text">{title}</p>
            <p className="mt-1 text-sm text-stone-500">{message}</p>
          </div>
        </div>

        {showSkeleton ? (
          <div className="mt-6 grid gap-3">
            <div className="h-3 w-11/12 animate-pulse rounded-full bg-stone-100" />
            <div className="h-3 w-8/12 animate-pulse rounded-full bg-stone-100" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="h-16 animate-pulse rounded-2xl bg-orange-50" />
              <div className="h-16 animate-pulse rounded-2xl bg-stone-100" />
              <div className="h-16 animate-pulse rounded-2xl bg-orange-50" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
