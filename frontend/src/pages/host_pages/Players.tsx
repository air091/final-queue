import axios from "axios";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import { api } from "../../lib/api";
import {
  EMPTY_MATCH_HISTORY_SUMMARY,
  buildPaymentsSummary,
  type AcceptedPlayers,
  type HostPlayerRecord,
  type SkillLevelType,
} from "../../lib/host";

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

const formatMatchResult = (result: string | null, team: string | null) => {
  if (!result) return "No result";

  const normalizedResult =
    result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();

  return team ? `${normalizedResult} (${team})` : normalizedResult;
};

type PlayerSectionProps = {
  title: string;
  description: string;
  players: HostPlayerRecord[];
  acceptedPlayers: AcceptedPlayers[];
  historyLoadingPlayerId: string | null;
  staticProfileUrlDrafts: Record<string, string>;
  savingStaticProfileUrlId: string | null;
  onAcceptPlayer: (hostedPlayerId: string) => void;
  onRejectPlayer: (hostedPlayerId: string) => void;
  onBanPlayer: (hostedPlayerId: string) => void;
  onUnbanPlayer: (hostedPlayerId: string) => void;
  onViewHistory: (player: HostPlayerRecord) => void;
  onUpdateStaticPlayerSkillLevel?: (
    hostedPlayerId: string,
    skillLevel: SkillLevelType,
  ) => void;
  onStaticProfileUrlDraftChange?: (
    hostedPlayerId: string,
    profileUrl: string,
  ) => void;
  onUpdateStaticPlayerProfileUrl?: (hostedPlayerId: string) => void;
  emptyMessage: string;
  extraContent?: ReactNode;
};

function PlayerSection({
  title,
  description,
  players,
  acceptedPlayers,
  historyLoadingPlayerId,
  staticProfileUrlDrafts,
  savingStaticProfileUrlId,
  onAcceptPlayer,
  onRejectPlayer,
  onBanPlayer,
  onUnbanPlayer,
  onViewHistory,
  onUpdateStaticPlayerSkillLevel,
  onStaticProfileUrlDraftChange,
  onUpdateStaticPlayerProfileUrl,
  emptyMessage,
  extraContent,
}: PlayerSectionProps) {
  return (
    <section className="rounded-3xl border border-orange-100 bg-white shadow-sm overflow-hidden">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-4 border-b border-orange-50 px-5 py-4">
        <div>
          <h4 className="text-base font-semibold text-[var(--color-text)]">
            {title}
          </h4>

          <p className="mt-1 text-sm text-stone-500">{description}</p>
        </div>

        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-orange-50 px-3 text-xs font-semibold text-[var(--color-accent)]">
          {players.length}
        </span>
      </header>

      {/* EXTRA CONTENT */}
      {extraContent ? (
        <div className="border-b border-orange-50 px-5 py-4">
          {extraContent}
        </div>
      ) : null}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-[#fffaf2]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Player
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Skill
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Photo URL
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Status
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Matches
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Last Result
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-orange-50">
            {players.length > 0 ? (
              players.map((playerRecord) => {
                const acceptedPlayer = acceptedPlayers.find(
                  (accepted) => accepted.id === playerRecord.id,
                );

                const isBanDisabled = acceptedPlayer?.matchStatus === "playing";

                return (
                  <tr
                    key={playerRecord.id}
                    className="transition hover:bg-orange-50/40"
                  >
                    {/* PLAYER */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full border border-orange-100 bg-orange-50">
                          <img
                            src={playerRecord.player.profileUrl}
                            alt={playerRecord.player.username}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text)]">
                            {playerRecord.player.username}
                          </span>

                          {playerRecord.player.isStatic ? (
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-medium text-stone-600">
                              Static
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* SKILL */}
                    <td className="px-5 py-4">
                      {playerRecord.player.isStatic &&
                      onUpdateStaticPlayerSkillLevel ? (
                        <select
                          value={playerRecord.player.skillLevel}
                          onChange={(event) =>
                            onUpdateStaticPlayerSkillLevel(
                              playerRecord.id,
                              event.target.value as SkillLevelType,
                            )
                          }
                          className="rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs font-medium text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="elite">Elite</option>
                        </select>
                      ) : (
                        <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-[var(--color-accent)]">
                          {formatSkillLevel(playerRecord.player.skillLevel)}
                        </span>
                      )}
                    </td>

                    {/* PHOTO URL */}
                    <td className="px-5 py-4">
                      {playerRecord.player.isStatic &&
                      onStaticProfileUrlDraftChange &&
                      onUpdateStaticPlayerProfileUrl ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={
                              staticProfileUrlDrafts[playerRecord.id] ??
                              playerRecord.player.profileUrl
                            }
                            onChange={(event) =>
                              onStaticProfileUrlDraftChange(
                                playerRecord.id,
                                event.target.value,
                              )
                            }
                            placeholder="https://example.com/player.jpg"
                            className="w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-xs outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              onUpdateStaticPlayerProfileUrl(playerRecord.id)
                            }
                            disabled={
                              savingStaticProfileUrlId === playerRecord.id
                            }
                            className={`rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${
                              savingStaticProfileUrlId === playerRecord.id
                                ? "cursor-not-allowed bg-stone-200 text-stone-500"
                                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)]"
                            }`}
                          >
                            {savingStaticProfileUrlId === playerRecord.id
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>

                    {/* STATUS */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          playerRecord.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : playerRecord.status === "requested"
                              ? "bg-yellow-100 text-yellow-700"
                              : playerRecord.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {playerRecord.status}
                      </span>
                    </td>

                    {/* MATCHES */}
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {acceptedPlayer?.matchHistory?.matchCount ?? "-"}
                    </td>

                    {/* LAST RESULT */}
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {acceptedPlayer?.matchHistory?.lastMatch?.result
                        ? formatMatchResult(
                            acceptedPlayer.matchHistory.lastMatch.result,
                            acceptedPlayer.matchHistory.lastMatch.team,
                          )
                        : "-"}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* HISTORY */}
                        <button
                          type="button"
                          onClick={() => onViewHistory(playerRecord)}
                          disabled={historyLoadingPlayerId === playerRecord.id}
                          className={`rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                            historyLoadingPlayerId === playerRecord.id
                              ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400"
                              : "border-orange-100 bg-white text-stone-700 hover:bg-orange-50"
                          }`}
                        >
                          {historyLoadingPlayerId === playerRecord.id
                            ? "Loading..."
                            : "History"}
                        </button>

                        {/* ACCEPT */}
                        {playerRecord.status !== "accepted" &&
                        playerRecord.status !== "banned" ? (
                          <button
                            type="button"
                            title="Accept"
                            onClick={() => onAcceptPlayer(playerRecord.id)}
                            className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-200 cursor-pointer"
                          >
                            Accept
                          </button>
                        ) : null}

                        {/* REJECT */}
                        {playerRecord.status === "requested" ? (
                          <button
                            type="button"
                            title="Reject"
                            onClick={() => onRejectPlayer(playerRecord.id)}
                            className="rounded-xl bg-red-100 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-200 cursor-pointer"
                          >
                            Reject
                          </button>
                        ) : null}

                        {/* BAN */}
                        {playerRecord.status === "accepted" ? (
                          <button
                            type="button"
                            title={
                              isBanDisabled
                                ? "Ban unavailable"
                                : `Ban ${playerRecord.player.username}`
                            }
                            disabled={isBanDisabled}
                            onClick={() => onBanPlayer(playerRecord.id)}
                            className={`rounded-xl px-3 py-2 text-xs font-medium transition cursor-pointer ${
                              isBanDisabled
                                ? "cursor-not-allowed bg-stone-200 text-stone-500"
                                : "bg-red-500 text-white hover:bg-red-600"
                            }`}
                          >
                            Ban
                          </button>
                        ) : null}

                        {/* UNBAN */}
                        {playerRecord.status === "banned" ? (
                          <button
                            type="button"
                            title="Unban"
                            onClick={() => onUnbanPlayer(playerRecord.id)}
                            className="rounded-xl bg-stone-700 px-3 py-2 text-xs font-medium text-white transition hover:bg-stone-800 cursor-pointer"
                          >
                            Unban
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-sm text-stone-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Players() {
  const { communityId, hostId } = useParams();
  const {
    playersInHost: players,
    setPlayersInHost,
    acceptedPlayers,
    setAcceptedPlayers,
    courts,
    setCourts,
    paymentsData,
    setPaymentsData,
    historyLoadingPlayerId,
    openPlayerHistory,
  } = useHostData();
  const [staticPlayerName, setStaticPlayerName] = useState("");
  const [staticSkillLevel, setStaticSkillLevel] =
    useState<SkillLevelType>("beginner");
  const [staticProfileUrlDrafts, setStaticProfileUrlDrafts] = useState<
    Record<string, string>
  >({});
  const [isCreatingStaticPlayer, setIsCreatingStaticPlayer] = useState(false);
  const [savingStaticProfileUrlId, setSavingStaticProfileUrlId] = useState<
    string | null
  >(null);
  const accountPlayers = players.filter((player) => !player.player.isStatic);
  const staticPlayers = players.filter((player) => player.player.isStatic);

  const handleCreateStaticPlayer = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanName = staticPlayerName.trim();
    if (!communityId || !hostId || !cleanName) return;

    setIsCreatingStaticPlayer(true);

    const previousPaymentsData = paymentsData;

    try {
      const response = await api.post(
        `/api/community/${communityId}/hosts/${hostId}/players/static`,
        {
          username: cleanName,
          skillLevel: staticSkillLevel,
        },
      );

      const player = response.data.hostedPlayer as AcceptedPlayers;
      const nextAcceptedPlayer: AcceptedPlayers = {
        ...player,
        matchHistory: player.matchHistory ?? EMPTY_MATCH_HISTORY_SUMMARY,
      };
      const hostPlayerRecord: HostPlayerRecord = {
        id: nextAcceptedPlayer.id,
        status: nextAcceptedPlayer.hostStatus,
        player: nextAcceptedPlayer.player,
      };

      setPlayersInHost((currentPlayers) => [
        hostPlayerRecord,
        ...currentPlayers,
      ]);
      setAcceptedPlayers((currentPlayers) => [
        nextAcceptedPlayer,
        ...currentPlayers,
      ]);
      setPaymentsData((currentPaymentsData) => {
        const newPaymentPlayer = {
          id: nextAcceptedPlayer.id,
          status: "accepted" as const,
          paymentStatus: "unpaid" as const,
          gamesPlayed: 0,
          player: {
            username: nextAcceptedPlayer.player.username,
            isStatic: nextAcceptedPlayer.player.isStatic,
          },
          payment: {
            id: null,
            amountExpected: currentPaymentsData.pricing.expectedFee,
            amountPaid: 0,
            balance: currentPaymentsData.pricing.expectedFee,
            currency: currentPaymentsData.pricing.currency,
            status: "unpaid" as const,
            method: null,
          },
        };

        const nextPlayers = [...currentPaymentsData.players, newPaymentPlayer];

        return {
          ...currentPaymentsData,
          players: nextPlayers,
          summary: buildPaymentsSummary(nextPlayers),
        };
      });
      setStaticProfileUrlDrafts((currentDrafts) => ({
        ...currentDrafts,
        [nextAcceptedPlayer.id]: nextAcceptedPlayer.player.profileUrl,
      }));
      setStaticPlayerName("");
      setStaticSkillLevel("beginner");
    } catch (error) {
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setIsCreatingStaticPlayer(false);
    }
  };

  const handleAcceptPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const nextAcceptedPlayer = previousPlayers.find(
      (player) => player.id === hostedPlayerId,
    );

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === hostedPlayerId
          ? { ...player, status: "accepted" }
          : player,
      ),
    );
    setAcceptedPlayers((currentPlayers) => {
      if (!nextAcceptedPlayer) return currentPlayers;
      if (
        currentPlayers.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPlayers;
      }

      return [
        ...currentPlayers,
        {
          id: nextAcceptedPlayer.id,
          hostStatus: "accepted",
          matchStatus: "waiting",
          timerStartedAt: new Date().toISOString(),
          player: nextAcceptedPlayer.player,
          queueEntry: null,
          courtAssignment: null,
          matchHistory: EMPTY_MATCH_HISTORY_SUMMARY,
        },
      ];
    });
    setPaymentsData((currentPaymentsData) => {
      if (!nextAcceptedPlayer) return currentPaymentsData;
      if (
        currentPaymentsData.players.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPaymentsData;
      }

      const newPaymentPlayer = {
        id: nextAcceptedPlayer.id,
        status: "accepted" as const,
        paymentStatus: "unpaid" as const,
        gamesPlayed: 0,
        player: {
          username: nextAcceptedPlayer.player.username,
          isStatic: nextAcceptedPlayer.player.isStatic,
        },
        payment: {
          id: null,
          amountExpected: currentPaymentsData.pricing.expectedFee,
          amountPaid: 0,
          balance: currentPaymentsData.pricing.expectedFee,
          currency: currentPaymentsData.pricing.currency,
          status: "unpaid" as const,
          method: null,
        },
      };

      const nextPlayers = [...currentPaymentsData.players, newPaymentPlayer];

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await api.post(
        `/api/private/actions/accept/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleRejectPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((player) =>
        player.id === hostedPlayerId
          ? { ...player, status: "rejected" }
          : player,
      ),
    );

    try {
      await api.post(
        `/api/private/actions/reject/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);

      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleBanPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const previousPaymentsData = paymentsData;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? { ...currentPlayer, status: "banned" }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.filter(
        (currentPlayer) => currentPlayer.id !== hostedPlayerId,
      ),
    );
    setCourts((currentCourts) =>
      currentCourts.map((court) => ({
        ...court,
        assignments: court.assignments.filter(
          (assignment) => assignment.playerId !== hostedPlayerId,
        ),
      })),
    );
    setPaymentsData((currentPaymentsData) => {
      const nextPlayers = currentPaymentsData.players.filter(
        (currentPlayer) => currentPlayer.id !== hostedPlayerId,
      );

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await api.post(
        `/api/private/actions/ban/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUnbanPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousPaymentsData = paymentsData;
    const nextAcceptedPlayer = previousPlayers.find(
      (player) => player.id === hostedPlayerId,
    );

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? { ...currentPlayer, status: "accepted" }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) => {
      if (!nextAcceptedPlayer) return currentPlayers;
      if (
        currentPlayers.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPlayers;
      }

      return [
        ...currentPlayers,
        {
          id: nextAcceptedPlayer.id,
          hostStatus: "accepted",
          matchStatus: "waiting",
          timerStartedAt: new Date().toISOString(),
          player: nextAcceptedPlayer.player,
          queueEntry: null,
          courtAssignment: null,
          matchHistory: EMPTY_MATCH_HISTORY_SUMMARY,
        },
      ];
    });
    setPaymentsData((currentPaymentsData) => {
      if (!nextAcceptedPlayer) return currentPaymentsData;
      if (
        currentPaymentsData.players.some(
          (currentPlayer) => currentPlayer.id === nextAcceptedPlayer.id,
        )
      ) {
        return currentPaymentsData;
      }

      const newPaymentPlayer = {
        id: nextAcceptedPlayer.id,
        status: "accepted" as const,
        paymentStatus: "unpaid" as const,
        gamesPlayed: 0,
        player: {
          username: nextAcceptedPlayer.player.username,
          isStatic: nextAcceptedPlayer.player.isStatic,
        },
        payment: {
          id: null,
          amountExpected: currentPaymentsData.pricing.expectedFee,
          amountPaid: 0,
          balance: currentPaymentsData.pricing.expectedFee,
          currency: currentPaymentsData.pricing.currency,
          status: "unpaid" as const,
          method: null,
        },
      };

      const nextPlayers = [...currentPaymentsData.players, newPaymentPlayer];

      return {
        ...currentPaymentsData,
        players: nextPlayers,
        summary: buildPaymentsSummary(nextPlayers),
      };
    });

    try {
      await api.post(
        `/api/private/actions/unban/community/${communityId}/hosts/${hostId}/players/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setPaymentsData(previousPaymentsData);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUpdateStaticPlayerSkillLevel = async (
    hostedPlayerId: string,
    skillLevel: SkillLevelType,
  ) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                skillLevel,
              },
            }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                skillLevel,
              },
            }
          : currentPlayer,
      ),
    );

    try {
      await api.patch(
        `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${hostedPlayerId}/skill-level`,
        { skillLevel },
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUpdateStaticPlayerProfileUrl = async (hostedPlayerId: string) => {
    const nextProfileUrl = staticProfileUrlDrafts[hostedPlayerId] ?? "";
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;

    setSavingStaticProfileUrlId(hostedPlayerId);

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                profileUrl:
                  nextProfileUrl.trim() || currentPlayer.player.profileUrl,
              },
            }
          : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === hostedPlayerId
          ? {
              ...currentPlayer,
              player: {
                ...currentPlayer.player,
                profileUrl:
                  nextProfileUrl.trim() || currentPlayer.player.profileUrl,
              },
            }
          : currentPlayer,
      ),
    );

    try {
      const response = await api.patch(
        `/api/private/actions/static/community/${communityId}/hosts/${hostId}/${hostedPlayerId}/profile-url`,
        {
          profileUrl: nextProfileUrl.trim() || null,
        },
      );

      const updatedPlayer = response.data.data as AcceptedPlayers;

      setPlayersInHost((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === hostedPlayerId
            ? {
                ...currentPlayer,
                player: updatedPlayer.player,
              }
            : currentPlayer,
        ),
      );
      setAcceptedPlayers((currentPlayers) =>
        currentPlayers.map((currentPlayer) =>
          currentPlayer.id === hostedPlayerId
            ? {
                ...currentPlayer,
                player: updatedPlayer.player,
              }
            : currentPlayer,
        ),
      );
      setStaticProfileUrlDrafts((currentDrafts) => ({
        ...currentDrafts,
        [hostedPlayerId]: updatedPlayer.player.profileUrl,
      }));
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    } finally {
      setSavingStaticProfileUrlId(null);
    }
  };

  return (
    <>
      <header className="mb-4 flex flex-col gap-2 rounded-3xl border border-orange-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-2xl">
            🏸
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
              Match Management
            </p>

            <h3 className="text-2xl font-bold text-[var(--color-text)]">
              Players Management
            </h3>
          </div>
        </div>

        <p className="text-sm text-stone-500">
          Manage player requests, queue participation, and walk-in badminton
          players.
        </p>
      </header>

      <div className="grid gap-5">
        <PlayerSection
          title="Account Players"
          description="Registered players connected to the platform."
          players={accountPlayers}
          acceptedPlayers={acceptedPlayers}
          historyLoadingPlayerId={historyLoadingPlayerId}
          staticProfileUrlDrafts={staticProfileUrlDrafts}
          savingStaticProfileUrlId={savingStaticProfileUrlId}
          onAcceptPlayer={handleAcceptPlayer}
          onRejectPlayer={handleRejectPlayer}
          onBanPlayer={handleBanPlayer}
          onUnbanPlayer={handleUnbanPlayer}
          onViewHistory={openPlayerHistory}
          emptyMessage="No account players yet."
        />

        <PlayerSection
          title="Static Players"
          description="Walk-in badminton players without an account."
          players={staticPlayers}
          acceptedPlayers={acceptedPlayers}
          historyLoadingPlayerId={historyLoadingPlayerId}
          staticProfileUrlDrafts={staticProfileUrlDrafts}
          savingStaticProfileUrlId={savingStaticProfileUrlId}
          onAcceptPlayer={handleAcceptPlayer}
          onRejectPlayer={handleRejectPlayer}
          onBanPlayer={handleBanPlayer}
          onUnbanPlayer={handleUnbanPlayer}
          onViewHistory={openPlayerHistory}
          onUpdateStaticPlayerSkillLevel={handleUpdateStaticPlayerSkillLevel}
          onStaticProfileUrlDraftChange={(hostedPlayerId, profileUrl) =>
            setStaticProfileUrlDrafts((currentDrafts) => ({
              ...currentDrafts,
              [hostedPlayerId]: profileUrl,
            }))
          }
          onUpdateStaticPlayerProfileUrl={handleUpdateStaticPlayerProfileUrl}
          emptyMessage="No static players yet."
          extraContent={
            <form
              onSubmit={(event) => void handleCreateStaticPlayer(event)}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-orange-100 bg-orange-50/40 p-4"
            >
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">
                  Static player
                </span>

                <input
                  type="text"
                  value={staticPlayerName}
                  onChange={(event) => setStaticPlayerName(event.target.value)}
                  placeholder="Player name"
                  className="block min-w-[220px] rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>

                <select
                  value={staticSkillLevel}
                  onChange={(event) =>
                    setStaticSkillLevel(event.target.value as SkillLevelType)
                  }
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-[var(--color-primary)] focus:ring-4 focus:ring-orange-100"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={isCreatingStaticPlayer}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isCreatingStaticPlayer
                    ? "cursor-not-allowed bg-stone-200 text-stone-400"
                    : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:scale-[0.98]"
                }`}
              >
                {isCreatingStaticPlayer ? "Adding..." : "Add player"}
              </button>
            </form>
          }
        />
      </div>
    </>
  );
}
