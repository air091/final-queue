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
    <div className="grid gap-5 p-1">
      {/* HEADER */}
      <header className="rounded-3xl border border-orange-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center rounded-full bg-[#fff4df] px-3 py-1 text-xs font-semibold tracking-wide text-[#ff6900]">
            🏸 Host Dashboard
          </span>

          <h3 className="text-3xl font-bold tracking-tight text-[#0c090c]">
            {host?.hostName ?? "Host overview"}
          </h3>

          <p className="text-sm text-stone-500">
            {host?.community.communityName ?? "Community"} ·{" "}
            {host?.sport ?? "Sport"}
          </p>
        </div>
      </header>

      {/* STATS */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">
                Total players
              </p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {playersInHost.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4df] text-xl">
              🏸
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Accepted</p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {acceptedPlayers.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-xl">
              ✅
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Waiting</p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {requestCount}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-xl">
              ⏳
            </div>
          </div>
        </div>
      </section>

      {/* SECOND ROW */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Rejected</p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {rejectedCount}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl">
              ❌
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Banned</p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {bannedCount}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-200 text-xl">
              🚫
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Courts</p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {courts.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4df] text-xl">
              🏟️
            </div>
          </div>
        </div>
      </section>

      {/* THIRD ROW */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">Queues</p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {queues.length}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4df] text-xl">
              📋
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">
                Payments outstanding
              </p>

              <p className="mt-3 text-4xl font-bold text-[#0c090c]">
                {paymentsData.summary.totalOutstanding}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4df] text-xl">
              💳
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
