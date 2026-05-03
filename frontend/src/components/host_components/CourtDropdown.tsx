import { useEffect, useState } from "react";

type CourtDropdownProps = {
  courtName: string;
  onRename: (nextName: string) => void;
  onDelete: () => void;
  isDeleteDisabled: boolean;
};

export default function CourtDropdown({
  courtName,
  onRename,
  onDelete,
  isDeleteDisabled,
}: CourtDropdownProps) {
  const [name, setName] = useState(courtName);

  useEffect(() => {
    setName(courtName);
  }, [courtName]);

  const handleSaveIfChanged = () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName === courtName) {
      setName(courtName);
      return;
    }

    onRename(cleanName);
  };

  return (
    <div className="absolute top-7 right-0 z-[140] grid w-[200px] gap-y-2 rounded-md border bg-white p-2 cursor-default">
      <div>
        <h2 className="font-semibold text-[12px] text-black leading-[10px]">
          Court settings
        </h2>
        <p className="text-[10px] font-semibold text-stone-500">
          Click outside or press "Enter" to save
        </p>
      </div>
      <div className="grid gap-y-1">
        <label
          htmlFor="court-name"
          className="text-[12px] font-semibold text-stone-500"
        >
          Court name
        </label>
        <input
          id="court-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveIfChanged}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-full rounded border px-2 py-1 text-[12px]"
        />
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
