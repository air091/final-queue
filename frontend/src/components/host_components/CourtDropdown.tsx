export default function CourtDropdown() {
  return (
    <div className="absolute top-7 right-0 z-50 grid w-[168px] gap-y-2 rounded-md border bg-white p-2 cursor-default">
      <div>
        <h2 className="font-semibold text-[12px] text-stone-400">
          Court settings
        </h2>
      </div>
      <div>
        <button
          type="button"
          className="block w-full rounded py-1 px-2 text-white bg-red-500 cursor-pointer hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
