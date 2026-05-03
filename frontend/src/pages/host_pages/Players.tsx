import axios from "axios";
import { useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { FaCheck } from "react-icons/fa6";
import { FcCancel } from "react-icons/fc";
import { useHostData } from "../../hooks/useHostData";
import type {
  AcceptedPlayers,
  HostPlayerRecord,
  SkillLevelType,
} from "../../lib/host";

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

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
  const [isCreatingStaticPlayer, setIsCreatingStaticPlayer] = useState(false);

  const handleCreateStaticPlayer = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanName = staticPlayerName.trim();
    if (!communityId || !hostId || !cleanName) return;

    setIsCreatingStaticPlayer(true);

    try {
      const response = await axios.post(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/players/static`,
        {
          username: cleanName,
          skillLevel: staticSkillLevel,
        },
        { withCredentials: true },
      );

      const hostedPlayer = response.data.hostedPlayer as AcceptedPlayers;
      const hostPlayerRecord: HostPlayerRecord = {
        id: hostedPlayer.id,
        status: hostedPlayer.status,
        player: hostedPlayer.player,
      };

      setPlayersInHost((currentPlayers) => [hostPlayerRecord, ...currentPlayers]);
      setAcceptedPlayers((currentPlayers) => [hostedPlayer, ...currentPlayers]);
      setStaticPlayerName("");
      setStaticSkillLevel("beginner");
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
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
      await axios.post(
        `http://localhost:4000/api/private/actions/accept/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
        { withCredentials: true },
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
      await axios.post(
        `http://localhost:4000/api/private/actions/reject/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
        { withCredentials: true },
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
      currentPlayers.filter((currentPlayer) => currentPlayer.id !== hostedPlayerId),
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
      await axios.post(
        `http://localhost:4000/api/private/actions/ban/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
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
      await axios.post(
        `http://localhost:4000/api/private/actions/unban/community/${communityId}/hosts/${hostId}/${hostedPlayerId}`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);
      setAcceptedPlayers(previousAcceptedPlayers);

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  return (
    <>
      <header className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <h3>Players Management</h3>
          <p className="text-sm text-stone-500">
            Add account players from join requests, or create a static player
            directly for walk-ins.
          </p>
        </div>
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
      </header>
      <div className="p-1">
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2">
                Player
              </th>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2 w-[144px]">
                Skill Level
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
                        <div className="border w-[28px] h-[28px] rounded-full">
                          <img
                            src={p.player.profileUrl}
                            alt={p.player.username}
                            className="block w-full h-full rounded-full"
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
                      <span className="inline-block rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-[12px]">
                        {formatSkillLevel(p.player.skillLevel)}
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md  text-[12px] cursor-default
                        ${
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
                            onClick={() => handleAcceptPlayer(p.id)}
                            className="bg-green-200 p-1 rounded-md cursor-pointer hover:bg-green-400"
                          />
                        )}

                        {p.status === "requested" && (
                          <FcCancel
                            size={28}
                            title="Reject"
                            onClick={() => handleRejectPlayer(p.id)}
                            className="bg-rose-200 p-1 rounded-md cursor-pointer hover:bg-rose-400"
                          />
                        )}

                        {p.status === "accepted" && (
                          <button
                            type="button"
                            title={isBanDisabled ? "Ban unavailable" : "Ban"}
                            disabled={isBanDisabled}
                            onClick={() => handleBanPlayer(p.id)}
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
                            onClick={() => handleUnbanPlayer(p.id)}
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
                <td colSpan={4} className="text-center py-1.5 px-2">
                  No players yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
