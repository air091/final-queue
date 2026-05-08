import type {
  MatchHistorySummary,
  PlayerHistoryTarget,
  PlayerMatchHistoryItem,
} from "../../lib/host";

const formatMatchResult = (result: string | null, team: string | null) => {
  if (!result) return "No result";

  const normalizedResult =
    result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();

  return team ? `${normalizedResult} (${team})` : normalizedResult;
};

const formatMatchDateTime = (value: string | null) => {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatWinningTeam = (teamWinner: string) => {
  if (teamWinner === "A" || teamWinner === "B") return `Team ${teamWinner}`;
  return "Unknown";
};

export const summarizePlayerHistory = (
  history: PlayerMatchHistoryItem[],
): MatchHistorySummary => {
  const lastMatch = history[0] ?? null;

  return {
    matchCount: history.length,
    winCount: history.filter((match) => match.result === "win").length,
    lossCount: history.filter((match) => match.result === "loss").length,
    lastMatch: lastMatch
      ? {
          team: lastMatch.team,
          result: lastMatch.result,
          startedAt: lastMatch.match.startedAt,
          endedAt: lastMatch.match.endedAt,
          teamWinner: lastMatch.match.teamWinner,
          courtName: lastMatch.match.court?.name ?? null,
        }
      : null,
  };
};

type PlayerHistoryModalProps = {
  player: PlayerHistoryTarget | null;
  summary: MatchHistorySummary;
  history: PlayerMatchHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
};

export default function PlayerHistoryModal({
  player,
  summary,
  history,
  isLoading,
  error,
  onClose,
}: PlayerHistoryModalProps) {
  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-stone-950/45 px-4 py-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-500">
              Match history
            </p>
            <h3 className="text-xl font-semibold text-stone-900">
              {player.player.username}
            </h3>
            <p className="text-sm text-stone-500">
              {player.player.isStatic ? "Static player" : "Account player"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
          >
            Close
          </button>
        </header>

        <div className="grid gap-3 border-b border-stone-200 px-5 py-4 sm:grid-cols-4">
          <div className="rounded-xl bg-stone-50 p-3">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Matches
            </div>
            <div className="mt-1 text-2xl font-semibold text-stone-900">
              {summary.matchCount}
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <div className="text-xs uppercase tracking-wide text-emerald-700">
              Wins
            </div>
            <div className="mt-1 text-2xl font-semibold text-emerald-900">
              {summary.winCount}
            </div>
          </div>
          <div className="rounded-xl bg-rose-50 p-3">
            <div className="text-xs uppercase tracking-wide text-rose-700">
              Losses
            </div>
            <div className="mt-1 text-2xl font-semibold text-rose-900">
              {summary.lossCount}
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 p-3">
            <div className="text-xs uppercase tracking-wide text-stone-500">
              Latest
            </div>
            <div className="mt-1 text-sm font-medium text-stone-900">
              {summary.lastMatch
                ? formatMatchResult(
                    summary.lastMatch.result,
                    summary.lastMatch.team,
                  )
                : "No matches yet"}
            </div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-stone-500">Loading player history...</p>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
              No finished matches recorded for this player yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {history.map((entry, index) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-stone-900">
                        Match {history.length - index}
                      </div>
                      <div className="mt-1 text-sm text-stone-600">
                        {entry.match.court?.name ?? "Unknown court"}
                      </div>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${
                        entry.result === "win"
                          ? "bg-emerald-100 text-emerald-800"
                          : entry.result === "loss"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-stone-200 text-stone-700"
                      }`}
                    >
                      {formatMatchResult(entry.result, entry.team)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                    <div>Started: {formatMatchDateTime(entry.match.startedAt)}</div>
                    <div>Ended: {formatMatchDateTime(entry.match.endedAt)}</div>
                    <div>Winning team: {formatWinningTeam(entry.match.teamWinner)}</div>
                    <div>Recorded: {formatMatchDateTime(entry.joinedAt)}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
