import axios from "axios";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { FaCheck } from "react-icons/fa6";
import { FcCancel } from "react-icons/fc";
import { useHostData } from "../../hooks/useHostData";
import { api } from "../../lib/api";
import type {
  AcceptedPlayers,
  HostPlayerRecord,
  SkillLevelType,
} from "../../lib/host";

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

type PlayerSectionProps = {
  title: string;
  description: string;
  players: HostPlayerRecord[];
  acceptedPlayers: AcceptedPlayers[];
  staticProfileUrlDrafts: Record<string, string>;
  savingStaticProfileUrlId: string | null;
  onAcceptPlayer: (hostedPlayerId: string) => void;
  onRejectPlayer: (hostedPlayerId: string) => void;
  onBanPlayer: (hostedPlayerId: string) => void;
  onUnbanPlayer: (hostedPlayerId: string) => void;
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
  staticProfileUrlDrafts,
  savingStaticProfileUrlId,
  onAcceptPlayer,
  onRejectPlayer,
  onBanPlayer,
  onUnbanPlayer,
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
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2">
                Player
              </th>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2 w-[144px]">
                Skill Level
              </th>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2 w-[280px]">
                Photo URL
              </th>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2 w-[128px]">
                Status
              </th>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2 w-[128px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {players.length > 0 ? (
              players.map((p) => {
                const acceptedPlayer = acceptedPlayers.find(
                  (accepted) => accepted.id === p.id,
                );
                const isBanDisabled = acceptedPlayer?.matchStatus === "playing";

                return (
                  <tr key={p.id} className="hover:bg-stone-100">
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-x-2 text-[14px]">
                        <div className="border w-[36px] h-[36px] rounded-full">
                          <img
                            src={p.player.profileUrl}
                            alt={p.player.username}
                            className="block w-full h-full object-cover object-center rounded-full"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{p.player.username}</span>
                          {p.player.isStatic && (
                            <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[11px] text-stone-700">
                              Static
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      {p.player.isStatic && onUpdateStaticPlayerSkillLevel ? (
                        <select
                          value={p.player.skillLevel}
                          onChange={(event) =>
                            onUpdateStaticPlayerSkillLevel(
                              p.id,
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
                          {formatSkillLevel(p.player.skillLevel)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      {p.player.isStatic &&
                      onStaticProfileUrlDraftChange &&
                      onUpdateStaticPlayerProfileUrl ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={
                              staticProfileUrlDrafts[p.id] ??
                              p.player.profileUrl
                            }
                            onChange={(event) =>
                              onStaticProfileUrlDraftChange(
                                p.id,
                                event.target.value,
                              )
                            }
                            placeholder="https://example.com/player.jpg"
                            className="w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-[12px]"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateStaticPlayerProfileUrl(p.id)}
                            disabled={savingStaticProfileUrlId === p.id}
                            className={`shrink-0 rounded-md px-2 py-1 text-[12px] text-white ${
                              savingStaticProfileUrlId === p.id
                                ? "cursor-not-allowed bg-stone-400"
                                : "cursor-pointer bg-stone-800 hover:bg-stone-700"
                            }`}
                          >
                            {savingStaticProfileUrlId === p.id
                              ? "Saving..."
                              : "Save"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-stone-400">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[12px] cursor-default ${
                          p.status === "accepted"
                            ? "bg-green-200 border border-green-500"
                            : p.status === "requested"
                              ? "bg-yellow-200 border border-yellow-500"
                              : p.status === "rejected"
                                ? "bg-rose-200 border border-rose-500"
                                : "bg-stone-300 border border-stone-500"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-x-2">
                        {p.status !== "accepted" && p.status !== "banned" && (
                          <FaCheck
                            size={28}
                            title="Accept"
                            onClick={() => onAcceptPlayer(p.id)}
                            className="bg-green-200 p-1 rounded-md cursor-pointer hover:bg-green-400"
                          />
                        )}

                        {p.status === "requested" && (
                          <FcCancel
                            size={28}
                            title="Reject"
                            onClick={() => onRejectPlayer(p.id)}
                            className="bg-rose-200 p-1 rounded-md cursor-pointer hover:bg-rose-400"
                          />
                        )}

                        {p.status === "accepted" && (
                          <button
                            type="button"
                            title={isBanDisabled ? "Ban unavailable" : "Ban"}
                            disabled={isBanDisabled}
                            onClick={() => onBanPlayer(p.id)}
                            className={`rounded-md px-2 py-1 text-[12px] text-white ${
                              isBanDisabled
                                ? "bg-stone-400 cursor-not-allowed"
                                : "bg-red-500 cursor-pointer hover:bg-red-700"
                            }`}
                          >
                            Ban
                          </button>
                        )}

                        {p.status === "banned" && (
                          <button
                            type="button"
                            title="Unban"
                            onClick={() => onUnbanPlayer(p.id)}
                            className="rounded-md bg-stone-700 px-2 py-1 text-[12px] text-white cursor-pointer hover:bg-stone-900"
                          >
                            Unban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-4 px-2 text-sm text-stone-500"
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

    try {
      const response = await api.post(
        `/api/community/${communityId}/hosts/${hostId}/players/static`,
        {
          username: cleanName,
          skillLevel: staticSkillLevel,
        },
      );

      const hostedPlayer = response.data.hostedPlayer as AcceptedPlayers;
      const hostPlayerRecord: HostPlayerRecord = {
        id: hostedPlayer.id,
        status: hostedPlayer.status,
        player: hostedPlayer.player,
      };

      setPlayersInHost((currentPlayers) => [
        hostPlayerRecord,
        ...currentPlayers,
      ]);
      setAcceptedPlayers((currentPlayers) => [hostedPlayer, ...currentPlayers]);
      setStaticProfileUrlDrafts((currentDrafts) => ({
        ...currentDrafts,
        [hostedPlayer.id]: hostedPlayer.player.profileUrl,
      }));
      setStaticPlayerName("");
      setStaticSkillLevel("beginner");
    } catch (error) {
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
    const nextAcceptedPlayer = previousPlayers.find(
      (player) => player.id === hostedPlayerId,
    );

    setPlayersInHost((prev) =>
      prev.map((p) =>
        p.id === hostedPlayerId ? { ...p, status: "accepted" } : p,
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
          status: "accepted",
          matchStatus: "waiting",
          timerStartedAt: new Date().toISOString(),
          player: nextAcceptedPlayer.player,
          queueEntry: null,
          courtAssignment: null,
        },
      ];
    });

    try {
      await api.post(
        `/api/private/actions/accept/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleRejectPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;

    setPlayersInHost((prev) =>
      prev.map((p) =>
        p.id === hostedPlayerId ? { ...p, status: "rejected" } : p,
      ),
    );

    try {
      await api.post(
        `/api/private/actions/reject/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
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
          (assignment) => assignment.hostedPlayerId !== hostedPlayerId,
        ),
      })),
    );

    try {
      await api.post(
        `/api/private/actions/ban/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  const handleUnbanPlayer = async (hostedPlayerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
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
          status: "accepted",
          matchStatus: "waiting",
          timerStartedAt: new Date().toISOString(),
          player: nextAcceptedPlayer.player,
          queueEntry: null,
          courtAssignment: null,
        },
      ];
    });

    try {
      await api.post(
        `/api/private/actions/unban/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

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
          staticProfileUrlDrafts={staticProfileUrlDrafts}
          savingStaticProfileUrlId={savingStaticProfileUrlId}
          onAcceptPlayer={handleAcceptPlayer}
          onRejectPlayer={handleRejectPlayer}
          onBanPlayer={handleBanPlayer}
          onUnbanPlayer={handleUnbanPlayer}
          emptyMessage="No account players yet."
        />
        <PlayerSection
          title="Static Players"
          description="Walk-in players without an account."
          players={staticPlayers}
          acceptedPlayers={acceptedPlayers}
          staticProfileUrlDrafts={staticProfileUrlDrafts}
          savingStaticProfileUrlId={savingStaticProfileUrlId}
          onAcceptPlayer={handleAcceptPlayer}
          onRejectPlayer={handleRejectPlayer}
          onBanPlayer={handleBanPlayer}
          onUnbanPlayer={handleUnbanPlayer}
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
