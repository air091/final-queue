import { useMemo } from "react";
import { useHostData } from "../../hooks/useHostData";

export default function Dashboard() {
  const { host, playersInHost, acceptedPlayers, courts, queues, paymentsData } =
    useHostData();

  const requestCount = useMemo(
    () =>
      playersInHost.filter((player) => player.status === "requested").length,
    [playersInHost],
  );

  const rejectedCount = useMemo(
    () => playersInHost.filter((player) => player.status === "rejected").length,
    [playersInHost],
  );

  const bannedCount = useMemo(
    () => playersInHost.filter((player) => player.status === "banned").length,
    [playersInHost],
  );

  return (
    <div className="grid gap-4 p-1">
      <header className="grid gap-2">
        <p className="text-sm uppercase tracking-[0.24em] text-stone-500">
          Host dashboard
        </p>
        <h3 className="text-2xl font-semibold text-stone-900">
          {host?.hostName ?? "Host overview"}
        </h3>
        <p className="text-sm text-stone-500">
          {host?.community.communityName ?? "Community"} ·{" "}
          {host?.sport ?? "Sport"}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Total players</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {playersInHost.length}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Accepted</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {acceptedPlayers.length}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Waiting</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {requestCount}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Rejected</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {rejectedCount}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Banned</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {bannedCount}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Courts</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {courts.length}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Queues</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {queues.length}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm text-stone-500">Payments outstanding</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {paymentsData.summary.totalOutstanding}
          </p>
        </div>
      </section>
    </div>
  );
}
