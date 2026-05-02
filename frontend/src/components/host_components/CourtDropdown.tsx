type CourtDropdownProps = {
  onDelete: () => void;
  isDeleteDisabled: boolean;
};

export default function CourtDropdown({
  onDelete,
  isDeleteDisabled,
}: CourtDropdownProps) {
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
          onClick={onDelete}
          disabled={isDeleteDisabled}
          className={`block w-full rounded py-1 px-2 text-white ${
            isDeleteDisabled
              ? "bg-stone-400 cursor-not-allowed"
              : "bg-red-500 cursor-pointer hover:bg-red-700"
          }`}
        >
          {isDeleteDisabled ? "Delete unavailable" : "Delete"}
        </button>
      </div>
    </div>
  );
}
