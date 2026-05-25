export type SkillLevelType =
  | "expert"
  | "advanced"
  | "upper_intermediate"
  | "intermediate"
  | "low_intermediate"
  | "high_beginner"
  | "beginner"
  | "low_beginner";

export const SKILL_LEVEL_OPTIONS: Array<{
  value: SkillLevelType;
  label: string;
  acronym: string;
  badgeClassName: string;
}> = [
  {
    value: "expert",
    label: "Expert",
    acronym: "EXP",
    badgeClassName: "border-red-900 text-red-900",
  },
  {
    value: "advanced",
    label: "Advance",
    acronym: "ADV",
    badgeClassName: "border-red-700 text-red-700",
  },
  {
    value: "upper_intermediate",
    label: "Upper Intermediate",
    acronym: "UI",
    badgeClassName: "border-red-300 text-red-500",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    acronym: "INT",
    badgeClassName: "border-green-500 text-green-700",
  },
  {
    value: "low_intermediate",
    label: "Low Intermediate",
    acronym: "LI",
    badgeClassName: "border-blue-500 text-blue-700",
  },
  {
    value: "high_beginner",
    label: "High Beginner",
    acronym: "HB",
    badgeClassName: "border-stone-800 text-stone-800",
  },
  {
    value: "beginner",
    label: "Beginner",
    acronym: "BEG",
    badgeClassName: "border-stone-500 text-stone-600",
  },
  {
    value: "low_beginner",
    label: "Low Beginner",
    acronym: "LB",
    badgeClassName: "border-stone-300 text-stone-500",
  },
];

const skillLevelByValue = new Map(
  SKILL_LEVEL_OPTIONS.map((option) => [option.value, option]),
);

export const getSkillLevelOption = (skillLevel: string | null | undefined) =>
  skillLevelByValue.get(skillLevel as SkillLevelType) ??
  skillLevelByValue.get("beginner")!;

export const formatSkillLevel = (skillLevel: string | null | undefined) =>
  getSkillLevelOption(skillLevel).label;

type SkillLevelBadgeProps = {
  skillLevel: string | null | undefined;
  showLabel?: boolean;
  className?: string;
};

export function SkillLevelBadge({
  skillLevel,
  showLabel = false,
  className = "",
}: SkillLevelBadgeProps) {
  const option = getSkillLevelOption(skillLevel);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`flex items-center justify-center rounded-full border bg-white px-1.5 text-[10px] font-medium ${option.badgeClassName}`}
        title={option.label}
      >
        {option.acronym}
      </span>
      {showLabel ? (
        <span className="text-xs font-medium text-stone-600">
          {option.label}
        </span>
      ) : null}
    </span>
  );
}
