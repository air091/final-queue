import type { PlayerType } from "../../pages/host_pages/Match";

// type PlayerType

type PlayerDropdownProps = {
  hostedPlayerId: string;
  player: PlayerType;
};

export default function PlayerSettingsDropdown({
  hostedPlayerId,
  player,
}: PlayerDropdownProps) {
  return (
    <div className="absolute top-7 left-0 boZrder p-2 z-50 bg-white rounded-md w-[168px] cursor-default border grid gap-y-2">
      <div>
        <h2 className="font-semibold text-[12px] text-stone-400 leading-[14px]">
          Player settings
        </h2>
        <h4 className="font-semibold">{player.username}</h4>
      </div>
      <div>
        <button className="w-full block bg-red-500 text-white border-none cursor-pointer hover:bg-red-700 rounded py-1 px-2">
          Ban
        </button>
      </div>
    </div>
  );
}
