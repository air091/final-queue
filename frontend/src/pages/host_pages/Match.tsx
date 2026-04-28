import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HiOutlineDotsVertical } from "react-icons/hi";

type PlayerType = {
  id: string;
  username: string;
  profileUrl: string;
};

type AcceptedPlayers = {
  id: string;
  player: PlayerType;
};

export default function Match() {
  const { communityId, hostId } = useParams();
  const [players, setPlayers] = useState<AcceptedPlayers[]>([]);

  const getPlayersAPI = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/players`,
        { withCredentials: true },
      );
      setPlayers(response.data.acceptedPlayers);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  useEffect(() => {
    getPlayersAPI();
  }, []);

  return (
    <>
      <header>
        <h3>Match</h3>
      </header>
      <main className="flex">
        {/* players */}
        <div className="w-full">
          <header>
            <h5>Players</h5>
          </header>
          <main className="border border-red-500 w-full h-full max-w-[328px] flex flex-wrap items-center p-2 gap-1">
            {players.length > 0 ? (
              players.map((p) => (
                <div
                  key={p.id}
                  className="border w-fit flex items-center gap-x-10 py-1 px-2 cursor-pointer hover:bg-stone-200"
                >
                  <div className="flex items-center gap-x-2">
                    <div className="w-[28px] h-[28px] rounded-full border">
                      <img
                        src={p.player.profileUrl}
                        alt={p.player.username}
                        className="block w-full h-full object-contain rounded-full"
                      />
                    </div>
                    <span>{p.player.username}</span>
                  </div>
                  <div className="cursor-pointer hover:bg-stone-400 p-1 rounded-full">
                    <HiOutlineDotsVertical />
                  </div>
                </div>
              ))
            ) : (
              <p>No players yet</p>
            )}
          </main>
        </div>
        <div></div>
      </main>
    </>
  );
}
