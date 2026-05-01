import axios from "axios";
import type { PlayerType } from "../../pages/host_pages/Match";
import { useParams } from "react-router-dom";

// type PlayerType

type PlayerDropdownProps = {
  player: PlayerType;
};

export default function PlayerSettingsDropdown({
  player,
}: PlayerDropdownProps) {
  const { communityId, hostId } = useParams();
  const banAPI = async () => {
    try {
      await axios.post(
        `http://localhost:4000/api/private/actions/ban/community/${communityId}/hosts/${hostId}/${player.id}`,
        {},
        { withCredentials: true },
      );
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleBanClick = async () => {
    await banAPI();
  };

  return (
    <div className="absolute top-7 left-0 boZrder p-2 z-50 bg-white rounded-md w-[168px] cursor-default border grid gap-y-2">
      <div>
        <h2 className="font-semibold text-[12px] text-stone-400 leading-[1  4px]">
          Player settings
        </h2>
        <h4 className="font-semibold">{player.username}</h4>
      </div>
      <div>
        <button
          onClick={handleBanClick}
          className="w-full block bg-red-500 text-white border-none cursor-pointer hover:bg-red-700 rounded py-1 px-2"
        >
          Ban
        </button>
      </div>
    </div>
  );
}
