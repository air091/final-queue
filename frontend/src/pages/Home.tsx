import axios from "axios";
import { useEffect, useState } from "react";

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
};

type PlayerType = {
  id: string;
  profileUrl: string;
  username: string;
};

type AcceptedPlayerType = {
  id: string;
  player: PlayerType;
};

type AvailableHostType = {
  id: string;
  hostName: string;
  sport: string;
  status: string;
  community: CommunityType;
  players: AcceptedPlayerType[];
};

export default function Home() {
  const [availableHosts, setAvailableHost] = useState<AvailableHostType[]>([]);

  const getAvailableHosts = async () => {
    try {
      const response = await axios.get(
        `http://localhost:4000/api/public/actions/hosts/available`,
        { withCredentials: true },
      );
      console.log(response.data.hosts);
      setAvailableHost(response.data.hosts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  useEffect(() => {
    getAvailableHosts();
  }, []);

  return (
    <div className="w-full p-2">
      <main className="w-full max-w-[520px] mx-auto">
        {availableHosts.map((availableHost) => (
          <div key={availableHost.id} className="w-full p-2 rounded-md border">
            <div className="flex items-center gap-x-1">
              <div className="rounded-full w-[42px] h-[42px]">
                <img
                  src={availableHost.community.profileUrl}
                  className="block border w-full h-full rounded-full object-contain"
                />
              </div>
              <div>
                <div>
                  <span className="block font-semibold">
                    {availableHost.community.communityName}
                  </span>
                </div>
                <div className="flex items-center gap-x-2">
                  <div className="flex items-center gap-x-1">
                    <div className="rounded-full w-[20px] h-[20px]">
                      <img
                        src={availableHost.community.admin.profileUrl}
                        className="block border w-full h-full rounded-full object-contain"
                      />
                    </div>
                    <span className="block text-[14px] font-semibold">
                      {availableHost.community.admin.username}
                    </span>
                  </div>
                  <div>0:00</div>
                </div>
              </div>
            </div>
            <div>{availableHost.hostName}</div>
            <div className="flex justify-end">
              <button className="block border px-6 cursor-pointer hover:bg-stone-200 rounded">
                Join
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
