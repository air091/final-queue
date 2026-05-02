import axios from "axios";
import { useParams } from "react-router-dom";
import { FaCheck } from "react-icons/fa6";
import { FcCancel } from "react-icons/fc";
import { useHostData } from "../../hooks/useHostData";

export default function Players() {
  const { communityId, hostId } = useParams();
  const {
    playersInHost: players,
    setPlayersInHost,
    acceptedPlayers,
    setAcceptedPlayers,
  } = useHostData();

  const handleAcceptPlayer = async (playerId: string) => {
    const previousPlayers = players;
    const previousAcceptedPlayers = acceptedPlayers;
    const nextAcceptedPlayer = previousPlayers.find(
      (player) => player.player.id === playerId,
    );

    setPlayersInHost((prev) =>
      prev.map((p) =>
        p.player.id === playerId ? { ...p, status: "accepted" } : p,
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
        `http://localhost:4000/api/private/actions/accept/community/${communityId}/hosts/${hostId}/${playerId}`,
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

  const handleRejectPlayer = async (playerId: string) => {
    const previousPlayers = players;

    setPlayersInHost((prev) =>
      prev.map((p) =>
        p.player.id === playerId ? { ...p, status: "rejected" } : p,
      ),
    );

    try {
      await axios.post(
        `http://localhost:4000/api/private/actions/reject/community/${communityId}/hosts/${hostId}/${playerId}`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      setPlayersInHost(previousPlayers);

      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between">
        <h3 className="w-[320px]">Players Management</h3>
        <div className="w-full">
          <input
            type="search"
            name="searc"
            id="search"
            placeholder="Search player"
            className="block border w-full max-w-[520px] px-4 py-1"
          />
        </div>
      </header>
      <div className="p-1">
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              <th className="text-start font-semibold text-[14px] py-1.5 px-2">
                Player
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
              players.map((p) => (
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
                      <span>{p.player.username}</span>
                    </div>
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
                      {p.status !== "accepted" && (
                        <FaCheck
                          size={28}
                          title="Accept"
                          onClick={() => handleAcceptPlayer(p.player.id)}
                          className="bg-green-200 p-1 rounded-md cursor-pointer hover:bg-green-400"
                        />
                      )}

                      {p.status === "requested" && (
                        <FcCancel
                          size={28}
                          title="Reject"
                          onClick={() => handleRejectPlayer(p.player.id)}
                          className="bg-rose-200 p-1 rounded-md cursor-pointer hover:bg-rose-400"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center py-1.5 px-2">
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
