import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

const CHUNK_RELOAD_KEY = "quetato:chunk-load-retry-at";
const CHUNK_RETRY_WINDOW_MS = 10_000;

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isChunkLoadError(message: string) {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk \d+ failed|ChunkLoadError|Unable to preload CSS/i.test(
    message,
  );
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);
  const isStaleChunk = isChunkLoadError(message);

  useEffect(() => {
    if (!isStaleChunk) return;

    const lastRetryAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    const canRetry = Date.now() - lastRetryAt > CHUNK_RETRY_WINDOW_MS;

    if (canRetry) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  }, [isStaleChunk]);

  const title = isStaleChunk ? "Updating app" : "Something went wrong";
  const description = isStaleChunk
    ? "A new version is available. Refresh the page to load the latest match screen."
    : "The page could not be loaded. Please try again.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-6">
      <section className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#0c090c]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">{description}</p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-[#ff6900] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e65f00]"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/home")}
            className="rounded-2xl border border-orange-100 px-4 py-3 text-sm font-medium text-[#0c090c] transition hover:bg-[#fff7e8]"
          >
            Go home
          </button>
        </div>

        {!isStaleChunk && (
          <p className="mt-5 break-words text-xs text-stone-400">{message}</p>
        )}
      </section>
    </div>
  );
}
