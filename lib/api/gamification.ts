import type {
  Badge,
  BadgeVerifyResult,
  GuildStanding,
  GuildVsGuild,
  LeaderboardEntry,
  LeaderboardPage,
  LeaderboardScope,
  LeagueStanding,
  LedgerAuditView,
  LedgerEntry,
  LedgerEntryDetail,
  ProgressContext,
  RankLevel,
  SeasonPassState,
  ShareCardData,
  SkillTreeNode,
  StreakState,
} from "@/lib/contracts/gamification";
import { jsonBody, requestJson, segment, withQuery } from "@/lib/api/client";

export async function getProgressContext(userId: string): Promise<ProgressContext> {
  void userId;
  return requestJson<ProgressContext>("/api/gamification/context");
}

export async function getRankLadder(): Promise<RankLevel[]> {
  return requestJson<RankLevel[]>("/api/gamification/rank-ladder");
}

export async function getStreak(userId: string): Promise<StreakState> {
  void userId;
  return requestJson<StreakState>("/api/gamification/streak");
}

export async function getLeagueStanding(userId: string): Promise<LeagueStanding | null> {
  void userId;
  return requestJson<LeagueStanding | null>("/api/gamification/league");
}

export async function getLeaderboard(
  scope: LeaderboardScope,
  offset: number,
  userId: string,
  displayName: string,
): Promise<LeaderboardPage> {
  void userId;
  void displayName;
  return requestJson<LeaderboardPage>(
    withQuery("/api/gamification/leaderboard", { scope, offset }),
  );
}

export async function getPublicLeaderboardPreview(): Promise<LeaderboardPage> {
  return requestJson<LeaderboardPage>("/api/gamification/public/leaderboard");
}

export async function getMyStanding(
  scope: LeaderboardScope,
  userId: string,
  displayName: string,
): Promise<LeaderboardEntry | null> {
  void userId;
  void displayName;
  return requestJson<LeaderboardEntry | null>(
    withQuery("/api/gamification/leaderboard/me", { scope }),
  );
}

export async function getGuildBoard(userId: string): Promise<GuildStanding> {
  void userId;
  return requestJson<GuildStanding>("/api/gamification/guild");
}

export async function getPublicGuildBoard(): Promise<GuildStanding> {
  return requestJson<GuildStanding>("/api/gamification/public/guild");
}

export async function getGuildVsGuild(userId: string): Promise<GuildVsGuild> {
  void userId;
  return requestJson<GuildVsGuild>("/api/gamification/guild/versus");
}

export async function getBadges(userId: string): Promise<Badge[]> {
  void userId;
  return requestJson<Badge[]>("/api/gamification/badges");
}

export async function verifyBadge(credentialId: string): Promise<BadgeVerifyResult> {
  return requestJson<BadgeVerifyResult>(
    `/api/gamification/credentials/${segment(credentialId)}`,
  );
}

export async function getSkillTree(userId: string): Promise<SkillTreeNode[]> {
  void userId;
  return requestJson<SkillTreeNode[]>("/api/gamification/skills");
}

export async function getShareCard(userId: string): Promise<ShareCardData> {
  void userId;
  return requestJson<ShareCardData>("/api/gamification/share-card");
}

export async function getSeasonPass(userId: string): Promise<SeasonPassState> {
  void userId;
  return requestJson<SeasonPassState>("/api/gamification/season-pass");
}

export async function getLedgerEntry(id: string): Promise<LedgerEntry> {
  return requestJson<LedgerEntry>(
    `/api/gamification/admin/ledger/${segment(id)}`,
  );
}

export async function getLedgerEntryDetail(id: string): Promise<LedgerEntryDetail> {
  return requestJson<LedgerEntryDetail>(
    `/api/gamification/admin/ledger/${segment(id)}/detail`,
  );
}

export async function getLedgerEntriesForAuditEvent(
  auditEventId: string,
): Promise<LedgerEntry | null> {
  return requestJson<LedgerEntry | null>(
    `/api/gamification/admin/audit/${segment(auditEventId)}/ledger`,
  );
}

export interface LedgerReconciliation {
  user_id: string;
  display_name: string;
  cached_total_xp: number;
  ledger_sum: number;
  delta_xp: number;
  entry_count: number;
  reconciled: boolean;
}

export async function reconcileLedgerBalance(
  userId: string,
): Promise<LedgerReconciliation> {
  return requestJson<LedgerReconciliation>(
    "/api/gamification/admin/reconcile",
    jsonBody({ user_id: userId }),
  );
}

export async function getLedgerAudit(userId: string): Promise<LedgerAuditView> {
  void userId;
  return requestJson<LedgerAuditView>("/api/gamification/ledger-audit");
}
