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
    <div className="absolute top-7 right-0 z-[140] w-[220px] rounded-2xl border border-stone-200 bg-white p-3 shadow-lg">
      {/* Header */}
      <div className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-stone-800">Court settings</h2>
        <p className="text-[11px] text-stone-400">
          Click outside or press Enter to save
        </p>
      </div>

      {/* Input */}
      <div className="mb-3 space-y-1">
        <label
          htmlFor="court-name"
          className="text-xs font-medium text-stone-500"
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
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-stone-300 focus:ring-2 focus:ring-stone-100"
        />
      </div>

      {/* Divider */}
      <div className="my-2 border-t border-stone-100" />

      {/* Actions */}
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleteDisabled}
        className={`
      w-full rounded-xl px-3 py-2 text-sm font-medium transition cursor-pointer
      ${
        isDeleteDisabled
          ? "cursor-not-allowed bg-stone-100 text-stone-400"
          : "bg-red-500 text-white hover:bg-red-600"
      }
    `}
      >
        {isDeleteDisabled ? "Delete unavailable" : "Delete court"}
      </button>
    </div>
  );
}
