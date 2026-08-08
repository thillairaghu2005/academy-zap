import { MockApiError } from "@/lib/api/errors";
import {
  getAuthenticatedUser,
  requireAdmin,
  requireUser,
} from "@/lib/server/authorization";
import {
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
  getProgressContext,
  getPublicGuildBoard,
  getPublicLeaderboardPreview,
  getRankLadder,
  getSeasonPass,
  getShareCard,
  getSkillTree,
  getStreak,
  reconcileLedgerBalance,
  verifyBadge,
} from "@/lib/server/domains/gamification";
import { idSchema, parseBody, parseQuery, route } from "@/lib/server/http";
import { z } from "zod";

const leaderboardQuerySchema = z.object({
  scope: z.enum(["global", "guild"]).optional().default("global"),
  offset: z.coerce.number().int().min(0).max(10_000).optional().default(0),
});

const reconcileSchema = z.object({
  user_id: idSchema,
});

function id(path: string[], index: number): string {
  return idSchema.parse(path[index]);
}

function expectPath(path: string[], expected: string[]): void {
  if (path.length !== expected.length) {
    throw new MockApiError("not_found", "Gamification route was not found.", 404);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== ":id" && path[index] !== expected[index]) {
      throw new MockApiError("not_found", "Gamification route was not found.", 404);
    }
  }
}

export async function handleGamification(
  request: Request,
  path: string[],
): Promise<Response> {
  return route(async () => {
    if (request.method === "GET" && path[0] === "rank-ladder") {
      expectPath(path, ["rank-ladder"]);
      return Response.json(await getRankLadder());
    }

    if (request.method === "GET" && path[0] === "public" && path[1] === "leaderboard") {
      expectPath(path, ["public", "leaderboard"]);
      return Response.json(await getPublicLeaderboardPreview());
    }

    if (request.method === "GET" && path[0] === "public" && path[1] === "guild") {
      expectPath(path, ["public", "guild"]);
      return Response.json(await getPublicGuildBoard());
    }

    if (request.method === "GET" && path[0] === "credentials" && path.length === 2) {
      expectPath(path, ["credentials", ":id"]);
      // Public, permanent verify URL — no session required (§7.3).
      return Response.json(await verifyBadge(id(path, 1)));
    }

    if (request.method === "GET" && path[0] === "leaderboard" && path[1] === "me") {
      expectPath(path, ["leaderboard", "me"]);
      const actor = await requireUser(request);
      const { scope } = parseQuery(request, leaderboardQuerySchema);
      return Response.json(
        await getMyStanding(scope, actor.id, actor.display_name),
      );
    }

    if (request.method === "GET" && path[0] === "leaderboard" && path.length === 1) {
      expectPath(path, ["leaderboard"]);
      const { scope, offset } = parseQuery(request, leaderboardQuerySchema);
      const actor = await getAuthenticatedUser(request);
      return Response.json(
        await getLeaderboard(
          scope,
          offset,
          actor?.id ?? "",
          actor?.display_name ?? "",
        ),
      );
    }

    if (request.method === "GET" && path[0] === "context") {
      expectPath(path, ["context"]);
      const actor = await requireUser(request);
      return Response.json(await getProgressContext(actor.id));
    }

    if (request.method === "GET" && path[0] === "streak") {
      expectPath(path, ["streak"]);
      const actor = await requireUser(request);
      return Response.json(await getStreak(actor.id));
    }

    if (request.method === "GET" && path[0] === "league") {
      expectPath(path, ["league"]);
      const actor = await requireUser(request);
      return Response.json(await getLeagueStanding(actor.id));
    }

    if (request.method === "GET" && path[0] === "guild" && path.length === 1) {
      expectPath(path, ["guild"]);
      const actor = await requireUser(request);
      return Response.json(await getGuildBoard(actor.id));
    }

    if (request.method === "GET" && path[0] === "guild" && path[1] === "versus") {
      expectPath(path, ["guild", "versus"]);
      const actor = await requireUser(request);
      return Response.json(await getGuildVsGuild(actor.id));
    }

    if (request.method === "GET" && path[0] === "badges") {
      expectPath(path, ["badges"]);
      const actor = await requireUser(request);
      return Response.json(await getBadges(actor.id));
    }

    if (request.method === "GET" && path[0] === "skills") {
      expectPath(path, ["skills"]);
      const actor = await requireUser(request);
      return Response.json(await getSkillTree(actor.id));
    }

    if (request.method === "GET" && path[0] === "share-card") {
      expectPath(path, ["share-card"]);
      const actor = await requireUser(request);
      return Response.json(await getShareCard(actor.id));
    }

    if (request.method === "GET" && path[0] === "season-pass") {
      expectPath(path, ["season-pass"]);
      const actor = await requireUser(request);
      return Response.json(await getSeasonPass(actor.id));
    }

    if (request.method === "GET" && path[0] === "ledger-audit") {
      expectPath(path, ["ledger-audit"]);
      const actor = await requireUser(request);
      return Response.json(await getLedgerAudit(actor.id));
    }

    if (request.method === "GET" && path[0] === "admin" && path[1] === "ledger") {
      await requireAdmin(request);
      if (path.length === 3) {
        expectPath(path, ["admin", "ledger", ":id"]);
        return Response.json(await getLedgerEntry(id(path, 2)));
      }
      if (path.length === 4 && path[3] === "detail") {
        expectPath(path, ["admin", "ledger", ":id", "detail"]);
        return Response.json(await getLedgerEntryDetail(id(path, 2)));
      }
    }

    if (
      request.method === "GET" &&
      path[0] === "admin" &&
      path[1] === "audit" &&
      path[3] === "ledger"
    ) {
      expectPath(path, ["admin", "audit", ":id", "ledger"]);
      await requireAdmin(request);
      return Response.json(await getLedgerEntriesForAuditEvent(id(path, 2)));
    }

    if (request.method === "POST" && path[0] === "admin" && path[1] === "reconcile") {
      expectPath(path, ["admin", "reconcile"]);
      await requireAdmin(request);
      const input = await parseBody(request, reconcileSchema);
      return Response.json(await reconcileLedgerBalance(input.user_id));
    }

    throw new MockApiError("not_found", "Gamification route was not found.", 404);
  });
}
