ALTER TYPE "SkillLevels" ADD VALUE IF NOT EXISTS 'expert';
ALTER TYPE "SkillLevels" ADD VALUE IF NOT EXISTS 'upper_intermediate';
ALTER TYPE "SkillLevels" ADD VALUE IF NOT EXISTS 'low_intermediate';
ALTER TYPE "SkillLevels" ADD VALUE IF NOT EXISTS 'high_beginner';
ALTER TYPE "SkillLevels" ADD VALUE IF NOT EXISTS 'low_beginner';

UPDATE "UserSport"
SET "skillLevel" = 'expert'
WHERE "skillLevel" = 'elite';
