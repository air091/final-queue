export default function CourtCard() {
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
        <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
          <span>Team A</span>
        </div>
        <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
          <span>Team B</span>
        </div>
        <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
          <span>Team A</span>
        </div>
        <div className="border w-full h-[46px] flex items-center justify-center rounded-md">
          <span>Team B</span>
        </div>
      </main>
    </div>
  );
}
