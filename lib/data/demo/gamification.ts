import { getMyProgressFromApi } from "@/lib/api/client";
import type { ProgressContext } from "@/lib/contracts/gamification";
import { AUTH_MODE } from "@/lib/config";
import { getProgressContext as getDemoProgressContext } from "./engines/gamification";

/**
 * Gamification data boundary (slice 04 §12-§14).
 *
 * `AUTH_MODE=demo`  → isolated demo fixtures; the demo service derives rank/XP/streak and the
 *                     client only renders it.
 * `AUTH_MODE=backend` → the authoritative FastAPI ProgressContext (`GET /me/progress`), which
 *                     the backend recomputes from the append-only XP ledger after every
 *                     accepted event. The frontend never calculates XP in either mode.
 */
export async function getProgressContext(userId: string): Promise<ProgressContext> {
  if (AUTH_MODE === "backend") return getMyProgressFromApi();
  return getDemoProgressContext(userId);
}

export {
  getBadges,
  getGuildBoard,
  getGuildVsGuild,
  getLeaderboard,
  getLeagueStanding,
  getLedgerAudit,
  getLedgerEntriesForAuditEvent,
  getLedgerEntry,
  getLedgerEntryDetail,
  getMyStanding,
  getPublicGuildBoard,
  getPublicLeaderboardPreview,
  getRankLadder,
  getSeasonPass,
  getShareCard,
  getSkillTree,
  getStreak,
  reconcileLedgerBalance,
  verifyBadge,
} from "./engines/gamification";
export type { LedgerReconciliation } from "./engines/gamification";
