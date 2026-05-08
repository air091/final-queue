import { useEffect, useState } from "react";

type QueueDropdownProps = {
  queueName: string;
  onRename: (nextName: string) => void;
  onDelete: () => void;
};

export default function QueueDropdown({
  queueName,
  onRename,
  onDelete,
}: QueueDropdownProps) {
  const [name, setName] = useState(queueName);

  useEffect(() => {
    setName(queueName);
  }, [queueName]);

  const handleSaveIfChanged = () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName === queueName) {
      setName(queueName);
      return;
    }

    onRename(cleanName);
  };

  return (
    <div className="absolute top-8 right-0 z-[140] w-[230px] rounded-2xl border border-[var(--color-secondary)]/40 bg-white p-4 shadow-[0_10px_30px_rgba(253,154,0,0.08)]">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          Queue Settings
        </h2>

        <p className="mt-1 text-[11px] text-stone-500">
          Click outside or press Enter to save
        </p>
      </div>

      {/* Input */}
      <div className="mb-4 space-y-1.5">
        <label
          htmlFor="queue-name"
          className="text-xs font-medium uppercase tracking-wide text-stone-500"
        >
          Queue name
        </label>

        <input
          id="queue-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSaveIfChanged}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="
        w-full rounded-xl border border-[var(--color-secondary)]/40
        bg-[var(--color-background)]
        px-3 py-2 text-sm text-[var(--color-text)]
        outline-none transition
        focus:border-[var(--color-primary)]
        focus:ring-4 focus:ring-[var(--color-secondary)]/30
      "
        />
      </div>

      {/* Divider */}
      <div className="my-3 border-t border-[var(--color-secondary)]/20" />

      {/* Actions */}
      <button
        type="button"
        onClick={onDelete}
        className="
      w-full cursor-pointer rounded-xl
      bg-[var(--color-accent)]
      px-3 py-2 text-sm font-medium text-white
      transition hover:bg-[var(--color-primary)]
    "
      >
        Delete queue
      </button>
    </div>
  );
}
