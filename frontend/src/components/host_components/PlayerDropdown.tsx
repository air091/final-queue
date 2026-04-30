import type { AcceptedPlayers } from "../../pages/host_pages/Match";

type PlayerDropdownProps = {
  id: string;
  player: AcceptedPlayers;
};

export default function PlayerSettingsDropdown({
  id,
  player,
}: PlayerDropdownProps) {
  return (
    <div className="absolute top-7 left-0 border p-2 z-50 bg-white rounded-md w-[256px]">
      Player settings
      <span>{player.player.username}</span>
    </div>
  );
}
