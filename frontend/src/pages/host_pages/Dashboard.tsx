import { useMemo } from "react";
import { useHostData } from "../../hooks/useHostData";

const formatHostDateTime = (value: string | null | undefined) => {
  if (!value) return "Any time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Any time";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function Dashboard() {
  const { host, playersInHost, acceptedPlayers, courts, queues, paymentsData } =
    useHostData();

  const waitingCount = useMemo(
    () =>
      acceptedPlayers.filter((player) => player.matchStatus === "waiting")
        .length,
    [acceptedPlayers],
  );

  const requestCount = useMemo(
    () => playersInHost.filter((player) => player.status === "requested").length,
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
    <div className="w-full px-2 py-2">
      <header className="mb-4 rounded-3xl border border-primary/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-accent">
            Host Dashboard
          </span>

          <h3 className="text-2xl font-bold text-text md:text-3xl">
            {host?.hostName ?? "Host overview"}
          </h3>

          <p className="text-sm text-stone-500">
            {host?.community.communityName ?? "Community"} -{" "}
            {host?.sport ?? "Sport"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
            <span className="rounded-full bg-stone-100 px-3 py-1">
              {host?.location?.trim() || "Location TBD"}
            </span>

            <span className="rounded-full bg-stone-100 px-3 py-1">
              Starts {formatHostDateTime(host?.startTime)}
            </span>

            <span className="rounded-full bg-stone-100 px-3 py-1">
              Ends {formatHostDateTime(host?.endTime)}
            </span>

            <span className="rounded-full bg-stone-100 px-3 py-1">
              {host?.maxPlayers && host.maxPlayers > 0
                ? `Max ${host.maxPlayers} players`
                : "Open capacity"}
            </span>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: "Total players",
            value: playersInHost.length,
            icon: "P",
          },
          {
            title: "Accepted",
            value: acceptedPlayers.length,
            icon: "A",
          },
          {
            title: "Capacity",
            value:
              host?.maxPlayers && host.maxPlayers > 0
                ? `${playersInHost.length}/${host.maxPlayers}`
                : "Open",
            icon: "C",
          },
          {
            title: "Waiting",
            value: waitingCount,
            icon: "W",
          },
          {
            title: "Requests",
            value: requestCount,
            icon: "Rq",
          },
          {
            title: "Rejected",
            value: rejectedCount,
            icon: "R",
          },
          {
            title: "Banned",
            value: bannedCount,
            icon: "B",
          },
          {
            title: "Courts",
            value: courts.length,
            icon: "Ct",
          },
          {
            title: "Queues",
            value: queues.length,
            icon: "Q",
          },
          {
            title: "Outstanding",
            value: paymentsData.summary.totalOutstanding,
            icon: "$",
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
