import type { ReactNode } from "react";

export type FriendPerson = {
  id: string;
  username: string;
  profileUrl: string;
};

export function PersonRow({
  person,
  meta,
  actions,
  variant = "row",
}: {
  person: FriendPerson;
  meta?: string;
  actions?: ReactNode;
  variant?: "row" | "card";
}) {
  const containerClass =
    variant === "card"
      ? "flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
      : "flex min-w-0 items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 last:border-b-0";

  return (
    <div className={containerClass}>
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={person.profileUrl}
          alt={person.username}
          className="h-10 w-10 shrink-0 rounded-full border border-orange-100 object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">
            {person.username}
          </p>
          {meta ? <p className="mt-0.5 text-xs text-stone-500">{meta}</p> : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function IconButton({
  title,
  onClick,
  disabled,
  children,
  className = "",
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
