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
    <div className="absolute top-8 right-0 z-[140] w-[240px] rounded-3xl border border-orange-100 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      {/* HEADER */}
      <div className="mb-4 space-y-1">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Court Settings
        </h2>

        <p className="text-[11px] text-stone-400">
          Click outside or press Enter to save
        </p>
      </div>

      {/* INPUT */}
      <div className="mb-4 space-y-2">
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
          className="
        w-full rounded-2xl border border-orange-100 bg-orange-50/40
        px-3 py-2.5 text-sm text-[var(--color-text)]
        outline-none transition-all duration-200
        focus:border-[var(--color-primary)]
        focus:bg-white
        focus:ring-4 focus:ring-orange-100
      "
        />
      </div>

      {/* DIVIDER */}
      <div className="my-3 border-t border-orange-100" />

      {/* ACTION */}
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleteDisabled}
        className={`
      w-full rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200
      ${
        isDeleteDisabled
          ? "cursor-not-allowed bg-stone-200 text-stone-400"
          : "cursor-pointer bg-[var(--color-accent)] text-white hover:bg-[#e85f00]"
      }
    `}
      >
        {isDeleteDisabled ? "Delete unavailable" : "Delete court"}
      </button>
    </div>
  );
}
