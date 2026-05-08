import axios from "axios";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { FaCheck } from "react-icons/fa6";
import { FcCancel } from "react-icons/fc";
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
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold">{title}</h4>
          <p className="text-sm text-stone-500">{description}</p>
        </div>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
          {players.length}
        </span>
      </header>
      {extraContent ? <div className="mb-4">{extraContent}</div> : null}
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-start text-[14px] font-semibold">
                Player
              </th>
              <th className="w-[144px] px-2 py-1.5 text-start text-[14px] font-semibold">
                Skill Level
              </th>
              <th className="w-[280px] px-2 py-1.5 text-start text-[14px] font-semibold">
                Photo URL
              </th>
              <th className="w-[128px] px-2 py-1.5 text-start text-[14px] font-semibold">
                Status
              </th>
              <th className="w-[96px] px-2 py-1.5 text-start text-[14px] font-semibold">
                Matches
              </th>
              <th className="w-[160px] px-2 py-1.5 text-start text-[14px] font-semibold">
                Last result
              </th>
              <th className="w-[220px] px-2 py-1.5 text-start text-[14px] font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {players.length > 0 ? (
              players.map((playerRecord) => {
                const acceptedPlayer = acceptedPlayers.find(
                  (accepted) => accepted.id === playerRecord.id,
                );
                const isBanDisabled = acceptedPlayer?.matchStatus === "playing";

                return (
                  <tr key={playerRecord.id} className="hover:bg-stone-100">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-x-2 text-[14px]">
                        <div className="h-[36px] w-[36px] rounded-full border">
                          <img
                            src={playerRecord.player.profileUrl}
                            alt={playerRecord.player.username}
                            className="block h-full w-full rounded-full object-cover object-center"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{playerRecord.player.username}</span>
                          {playerRecord.player.isStatic ? (
                            <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] text-stone-700">
                              Static
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
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
                          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-[12px]"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                          <option value="elite">Elite</option>
                        </select>
                      ) : (
                        <span className="inline-block rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-[12px]">
                          {formatSkillLevel(playerRecord.player.skillLevel)}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
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
                            className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-[12px]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateStaticPlayerProfileUrl(playerRecord.id)
                            }
                            disabled={savingStaticProfileUrlId === playerRecord.id}
                            className={`shrink-0 rounded-md px-2 py-1 text-[12px] text-white ${
                              savingStaticProfileUrlId === playerRecord.id
                                ? "cursor-not-allowed bg-stone-400"
                                : "cursor-pointer bg-stone-800 hover:bg-stone-700"
                            }`}
                          >
                            {savingStaticProfileUrlId === playerRecord.id
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-stone-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-block cursor-default rounded-md px-2 py-0.5 text-[12px] ${
                          playerRecord.status === "accepted"
                            ? "border border-green-500 bg-green-200"
                            : playerRecord.status === "requested"
                              ? "border border-yellow-500 bg-yellow-200"
                              : playerRecord.status === "rejected"
                                ? "border border-rose-500 bg-rose-200"
                                : "border border-stone-500 bg-stone-300"
                        }`}
                      >
                        {playerRecord.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-[12px]">
                      {acceptedPlayer?.matchHistory?.matchCount ?? "-"}
                    </td>
                    <td className="px-2 py-1.5 text-[12px]">
                      {acceptedPlayer?.matchHistory?.lastMatch?.result
                        ? formatMatchResult(
                            acceptedPlayer.matchHistory.lastMatch.result,
                            acceptedPlayer.matchHistory.lastMatch.team,
                          )
                        : "-"}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewHistory(playerRecord)}
                          disabled={historyLoadingPlayerId === playerRecord.id}
                          className={`rounded-md px-2 py-1 text-[12px] ${
                            historyLoadingPlayerId === playerRecord.id
                              ? "cursor-not-allowed bg-stone-200 text-stone-500"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          {historyLoadingPlayerId === playerRecord.id
                            ? "Loading..."
                            : "History"}
                        </button>
                        {playerRecord.status !== "accepted" &&
                        playerRecord.status !== "banned" ? (
                          <FaCheck
                            size={28}
                            title="Accept"
                            onClick={() => onAcceptPlayer(playerRecord.id)}
                            className="cursor-pointer rounded-md bg-green-200 p-1 hover:bg-green-400"
                          />
                        ) : null}

                        {playerRecord.status === "requested" ? (
                          <FcCancel
                            size={28}
                            title="Reject"
                            onClick={() => onRejectPlayer(playerRecord.id)}
                            className="cursor-pointer rounded-md bg-rose-200 p-1 hover:bg-rose-400"
                          />
                        ) : null}

                        {playerRecord.status === "accepted" ? (
                          <button
                            type="button"
                            title={isBanDisabled ? "Ban unavailable" : "Ban"}
                            disabled={isBanDisabled}
                            onClick={() => onBanPlayer(playerRecord.id)}
                            className={`rounded-md px-2 py-1 text-[12px] text-white ${
                              isBanDisabled
                                ? "cursor-not-allowed bg-stone-400"
                                : "cursor-pointer bg-red-500 hover:bg-red-700"
                            }`}
                          >
                            Ban
                          </button>
                        ) : null}

                        {playerRecord.status === "banned" ? (
                          <button
                            type="button"
                            title="Unban"
                            onClick={() => onUnbanPlayer(playerRecord.id)}
                            className="cursor-pointer rounded-md bg-stone-700 px-2 py-1 text-[12px] text-white hover:bg-stone-900"
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
                  className="px-2 py-4 text-center text-sm text-stone-500"
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
        player.id === hostedPlayerId ? { ...player, status: "accepted" } : player,
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
        player.id === hostedPlayerId ? { ...player, status: "rejected" } : player,
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
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <h3>Players Management</h3>
        </div>
      </header>
      <div className="grid gap-4 p-1">
        <PlayerSection
          title="Account Players"
          description="Real accounts."
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
          description="Walk-in players without an account."
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
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-sm">
                <span>Static player</span>
                <input
                  type="text"
                  value={staticPlayerName}
                  onChange={(event) => setStaticPlayerName(event.target.value)}
                  placeholder="Player name"
                  className="block min-w-[220px] rounded-md border px-3 py-1.5"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Skill</span>
                <select
                  value={staticSkillLevel}
                  onChange={(event) =>
                    setStaticSkillLevel(event.target.value as SkillLevelType)
                  }
                  className="rounded-md border px-3 py-1.5"
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
                className={`rounded-md px-3 py-1.5 text-sm text-white ${
                  isCreatingStaticPlayer
                    ? "cursor-not-allowed bg-stone-400"
                    : "cursor-pointer bg-stone-800 hover:bg-stone-700"
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
