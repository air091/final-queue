import axios from "axios";
import { useParams } from "react-router-dom";
import { useHostData } from "../../hooks/useHostData";
import type { AcceptedPlayers } from "../../lib/host";

type PlayerDropdownProps = {
  player: AcceptedPlayers;
};

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
      `http://localhost:4000/api/private/actions/ban/community/${communityId}/hosts/${hostId}/${player.player.id}`,
      {},
      { withCredentials: true },
    );
  };

  const handleBanClick = async () => {
    if (isPlayerInGame) return;

    const previousPlayersInHost = playersInHost;
    const previousAcceptedPlayers = acceptedPlayers;
    const previousCourts = courts;

    setPlayersInHost((currentPlayers) =>
      currentPlayers.filter((currentPlayer) => currentPlayer.id !== player.id),
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

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
      else console.error(error);
    }
  };

  return (
    <div className="absolute top-7 left-0 border p-2 z-50 bg-white rounded-md w-[168px] cursor-default grid gap-y-2">
      <div>
        <h2 className="font-semibold text-[12px] text-stone-400 leading-[1  4px]">
          Player settings
        </h2>
        <h4 className="font-semibold">{player.player.username}</h4>
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
