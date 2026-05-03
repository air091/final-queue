import type { Prisma } from "../generated/prisma/client.js";
import { SkillLevel } from "../generated/prisma/enums.js";

export const DEFAULT_HOSTED_PLAYER_PROFILE_URL =
  "https://image.pngaaa.com/189/734189-middle.png";

export const hostedPlayerProfileSelect = {
  player: {
    select: {
      id: true,
      username: true,
      profileUrl: true,
      skillLevel: true,
    },
  },
  staticName: true,
  staticProfileUrl: true,
  staticSkillLevel: true,
} satisfies Prisma.HostedPlayerSelect;

export type HostedPlayerProfileSource = Prisma.HostedPlayerGetPayload<{
  select: typeof hostedPlayerProfileSelect;
}>;

export const toHostedPlayerProfile = (
  hostedPlayer: HostedPlayerProfileSource,
) => ({
  id: hostedPlayer.player?.id ?? null,
  username: hostedPlayer.player?.username ?? hostedPlayer.staticName ?? "Player",
  profileUrl:
    hostedPlayer.player?.profileUrl ??
    hostedPlayer.staticProfileUrl ??
    DEFAULT_HOSTED_PLAYER_PROFILE_URL,
  skillLevel:
    hostedPlayer.player?.skillLevel ??
    hostedPlayer.staticSkillLevel ??
    SkillLevel.beginner,
  isStatic: hostedPlayer.player === null,
});
