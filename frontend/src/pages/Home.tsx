import axios from "axios";
import { useEffect, useState } from "react";

type PlayerType = {
  id: string;
  profileUrl: string;
  username: string;
};

type AcceptedPlayerType = {
  id: string;
  player: PlayerType;
};

export default function Home() {
  const [players, setPlayers] = useState<AcceptedPlayerType[]>([]);

  const getPlayersAPI = async (communityId: string, hostId: string) => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/community/${communityId}/hosts/${hostId}/players`,
        {
          withCredentials: true,
        },
      );
      console.log(response.data);
      setPlayers(response.data.acceptedPlayers);
    } catch (error) {
      if (axios.isAxiosError(error))
        console.error(error.response?.data?.message);
      else console.error("Login api failed:", error);
    }
  };

  useEffect(() => {
    getPlayersAPI(
      "5f819781-82aa-496c-96fd-5df661dfd9f0",
      "845fec89-34fa-4a85-807d-f8172ab86dc2",
    );
  }, []);

  return (
    <div>
      <header>Home</header>
      <main>
        {/* players */}
        <section>
          <header>Players</header>
          <main className="border w-full max-w-[240px] flex flex-wrap p-2 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("playerId", p.id)
                }
                className="border flex items-center w-fit gap-x-2 p-2 rounded-md cursor-pointer hover:bg-green-200"
              >
                <div className="px-4 py-1 border rounded-full w-[38px] h-[38px]">
                  <img
                    src={p.player.profileUrl}
                    alt={p.player.username}
                    className="block max-w-full object-contain"
                  />
                </div>
                <span>{p.player.username}</span>
              </div>
            ))}
          </main>
        </section>
      </main>

      {/* DROP ZONE */}
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          const playerId = event.dataTransfer.getData("playerId");
          console.log("dropped", playerId);
        }}
        className="border w-64 h-64 flex items-center justify-center"
      >
        Drop here
      </div>
    </div>
  );
}
