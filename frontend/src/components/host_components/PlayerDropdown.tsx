import axios from "axios";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import type { AcceptedPlayers } from "../../lib/host";

type PlayerDropdownProps = {
  player: AcceptedPlayers;
};

const formatSkillLevel = (skillLevel: string) =>
  skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1);

export default function PlayerSettingsDropdown({
  player,
}: PlayerDropdownProps) {
  const { communityId, hostId } = useParams();
  const {
    playersInHost,
    setPlayersInHost,
    acceptedPlayers,
    setAcceptedPlayers,
    courts,
    setCourts,
  } = useHostData();
  const isPlayerInGame = player.matchStatus === "playing";

  const banAPI = async () => {
    await axios.post(
      `http://localhost:4000/api/private/actions/ban/community/${communityId}/hosts/${hostId}/${player.id}`,
      {},
      { withCredentials: true },
    );
  };

  const handleBanClick = async () => {
    if (isPlayerInGame) return;

    const previousPlayersInHost = playersInHost;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;
    const bannedPlayerRecord = {
      id: player.id,
      status: "banned" as const,
      player: player.player,
    };

    setPlayersInHost((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id ? bannedPlayerRecord : currentPlayer,
      ),
    );
    setAcceptedPlayers((currentPlayers) =>
      currentPlayers.filter((currentPlayer) => currentPlayer.id !== player.id),
    );
    setCourts((currentCourts) =>
      currentCourts.map((court) => ({
        ...court,
        assignments: court.assignments.filter(
          (assignment) => assignment.hostedPlayerId !== player.id,
        ),
      })),
    );

    try {
      await banAPI();
    } catch (error) {
      setPlayersInHost(previousPlayersInHost);
      setAcceptedPlayers(previousAcceptedPlayers);
      setCourts(previousCourts);

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  return (
    <div className="absolute top-7 left-0 z-[140] grid w-[168px] gap-y-2 rounded-md border bg-white p-2 cursor-default">
      <div>
        <h2 className="font-semibold text-[12px] text-stone-400 leading-[1  4px]">
          Player settings
        </h2>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{player.player.username}</h4>
          {player.player.isStatic && (
            <span className="rounded-md bg-stone-200 px-1.5 text-[10px] text-stone-700 uppercase">
              Static
            </span>
          )}
        </div>
        <p className="text-[12px] text-stone-500">
          Level: {formatSkillLevel(player.player.skillLevel)}
        </p>
        {player.player.isStatic && (
          <p className="text-[12px] text-stone-500">Host-only player</p>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={handleBanClick}
          disabled={isPlayerInGame}
          className={`w-full block text-white border-none rounded py-1 px-2 ${
            isPlayerInGame
              ? "bg-stone-400 cursor-not-allowed"
              : "bg-red-500 cursor-pointer hover:bg-red-700"
          }`}
        >
          {isPlayerInGame ? "Ban unavailable" : "Ban"}
        </button>
      </div>
    </div>
  );
}
