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
    <div className="w-full py-2 px-2">
      {/* HEADER */}
      <header className="rounded-3xl border border-primary/10 bg-white p-5 shadow-sm mb-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-accent">
            🏸 Host Dashboard
          </span>

          <h3 className="text-2xl font-bold text-text md:text-3xl">
            {host?.hostName ?? "Host overview"}
          </h3>

          <p className="text-sm text-stone-500">
            {host?.community.communityName ?? "Community"} ·{" "}
            {host?.sport ?? "Sport"}
          </p>
        </div>
      </header>

      {/* STATS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: "Total players",
            value: playersInHost.length,
            icon: "🏸",
          },
          {
            title: "Accepted",
            value: acceptedPlayers.length,
            icon: "✅",
          },
          {
            title: "Waiting",
            value: requestCount,
            icon: "⏳",
          },
          {
            title: "Rejected",
            value: rejectedCount,
            icon: "❌",
          },
          {
            title: "Banned",
            value: bannedCount,
            icon: "🚫",
          },
          {
            title: "Courts",
            value: courts.length,
            icon: "🏟️",
          },
          {
            title: "Queues",
            value: queues.length,
            icon: "📋",
          },
          {
            title: "Outstanding",
            value: paymentsData.summary.totalOutstanding,
            icon: "💳",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="
            rounded-3xl border border-primary/10
            bg-white p-5 shadow-sm
            transition hover:-translate-y-0.5 hover:shadow-md
          "
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">
                  {item.title}
                </p>

                <p className="mt-3 text-3xl font-bold text-text md:text-4xl">
                  {item.value}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl">
                {item.icon}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
