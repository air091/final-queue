import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaCheck } from "react-icons/fa6";
import { FcCancel } from "react-icons/fc";

type PlayerType = {
  id: string;
  username: string;
  profileUrl: string;
};

type PlayersType = {
  id: string;
  status: string;
  player: PlayerType;
};

export default function Players() {
  const { communityId, hostId } = useParams();
  const [players, setPlayers] = useState<PlayersType[]>([]);

  const getPlayersInHost = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}`,
        {
          withCredentials: true,
        },
      );
      console.log(response);
      setPlayers([
        ...response.data.acceptedPlayers,
        ...response.data.requestedPlayers,
      ]);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  useEffect(() => {
    getPlayersInHost();
  }, []);

  const handleAcceptPlayer = async (playerId: string) => {
    // rollback
    const previousPlayers = players;

    setPlayers((prev) =>
      prev.map((p) =>
        p.player.id === playerId ? { ...p, status: "accepted" } : p,
      ),
    );

    try {
      await axios.post(
        `http://localhost:4000/api/actions/accept/community/${communityId}/hosts/${hostId}/${playerId}`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      setPlayers(previousPlayers);

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
      <div>
        <table className="border w-full">
          <thead>
            <tr>
              <th className="text-start">Player</th>
              <th className="text-start">Status</th>
              <th className="text-start">Actions</th>
            </tr>
          </thead>
          <tbody>
            {players.length > 0 ? (
              players.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-x-2">
                      <div className="border w-[32px] h-[32px] rounded-full">
                        <img
                          src={p.player.profileUrl}
                          alt={p.player.username}
                          className="block w-full h-full rounded-full"
                        />
                      </div>
                      <span>{p.player.username}</span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md ${
                        p.status === "accepted"
                          ? "bg-green-200 border border-green-500"
                          : "bg-rose-200 border border-rose-500"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td>
                    {p.status === "accepted" ? null : (
                      <div className="flex items-center gap-x-2">
                        <FaCheck
                          size={28}
                          onClick={() => handleAcceptPlayer(p.player.id)}
                          className="bg-green-200 p-1 rounded-md cursor-pointer hover:bg-green-400"
                        />
                        <FcCancel
                          size={28}
                          className="bg-rose-200 p-1 rounded-md cursor-pointer hover:bg-rose-400"
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center">
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
