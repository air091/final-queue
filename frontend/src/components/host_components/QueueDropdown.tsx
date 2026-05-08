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
    <div className="absolute top-7 right-0 z-[140] w-[220px] rounded-2xl border border-stone-200 bg-white p-3 shadow-lg">
      <div className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-stone-800">Queue settings</h2>
        <p className="text-[11px] text-stone-400">
          Click outside or press "Enter" to save
        </p>
      </div>
      <div className="mb-3 space-y-1">
        <label
          htmlFor="queue-name"
          className="text-xs font-medium text-stone-500"
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
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 shadow-sm outline-none transition focus:border-stone-300 focus:ring-2 focus:ring-stone-100"
        />
      </div>
      {/* Divider */}
      <div className="my-2 border-t border-stone-100" />
      <div>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-xl px-3 py-2 text-sm font-medium transition cursor-pointer bg-red-500 text-white hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
