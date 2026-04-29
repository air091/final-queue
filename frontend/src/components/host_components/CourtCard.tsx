import { HiOutlineDotsVertical } from "react-icons/hi";
import type { AcceptedPlayers, CourtType } from "../../pages/host_pages/Match";

type CourtCardProps = {
  court: CourtType;
  players: AcceptedPlayers[];
};

const COURT_SLOTS = [
  { position: 1, label: "Team A" },
  { position: 2, label: "Team B" },
  { position: 3, label: "Team A" },
  { position: 4, label: "Team B" },
];

export default function CourtCard({ court, players }: CourtCardProps) {
  const getSlotLabel = (position: number) => {
    const assignment = court.assignments.find(
      (item) => item.position === position,
    );
    if (!assignment) {
      return (
        COURT_SLOTS.find((slot) => slot.position === position)?.label ?? ""
      );
    }

    return (
      players.find((player) => player.id === assignment.hostedPlayerId)?.player
        .username ??
      COURT_SLOTS.find((slot) => slot.position === position)?.label ??
      ""
    );
  };

  return (
    <div className="border w-[420px] p-2 rounded-md">
      <header className="flex items-center justify-between">
        <span>{court.name}</span>
        <div className="flex items-center gap-x-2">
          {/* <span>{court.}</span> */}
          <div className="cursor-pointer hover:bg-stone-400 p-1 rounded-full w-fit">
            <HiOutlineDotsVertical />
          </div>
        </div>
      </header>
      <main className="grid grid-cols-2 gap-x-2 gap-y-3 mt-3">
        {COURT_SLOTS.map((slot) => (
          <div
            key={slot.position}
            className="border w-full h-[46px] flex items-center justify-center rounded-md"
          >
            <span>{getSlotLabel(slot.position)}</span>
          </div>
        ))}
      </main>
    </div>
  );
}
