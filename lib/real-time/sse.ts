/**
 * Slice 07 — real-time freshness client (gamification §2.3/§5.4).
 *
 * The ONE job of this hook: when the backend says "something changed", invalidate the
 * TanStack Query cache so the authoritative APIs are refetched. It NEVER treats an SSE
 * payload as authoritative state — the payload carries no values at all ("something
 * changed"), and the UI always re-reads GET /me/progress and GET /leaderboards/*.
 *
 * Transport notes:
 * - `AUTH_MODE=demo` → the hook is a no-op (demo runs without FastAPI; no SSE requests).
 * - `AUTH_MODE=backend` → exchange the session's access token for a short-lived single-use
 *   SSE ticket (the normal apiRequest path), then open `EventSource` on the proxied
 *   `/api/backend/events?ticket=...`. The ticket is one-time and TTL-bounded; it is NOT the
 *   access token, so it never rides logs/history as a long-lived credential.
 * - Reconnect: EventSource auto-reconnects, but the ticket is single-use, so each reconnect
 *   re-issues a fresh ticket. Backoff is capped. Duplicate deliveries are harmless — the
 *   handler only invalidates queries, and the server stays authoritative.
 * - Failure isolation: any SSE failure (ticket fetch, EventSource error) is logged and
 *   retried with backoff. The app never renders differently because SSE is down — SSE only
 *   improves freshness; pages still load from the authoritative APIs.
 */

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getSseTicketFromApi } from "@/lib/api/client";
import { AUTH_MODE } from "@/lib/config";

/** Client-facing SSE event types (the backend's transport envelope, slice 07 §3). */
export type SseEventType = "connected" | "progress.updated" | "leaderboard.updated" | "update";

const SSE_PATH = "/api/backend/events";
const MAX_RECONNECT_DELAY_MS = 15_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

interface SseUpdate {
  type: SseEventType;
  [key: string]: unknown;
}

export function parseEventData(raw: string): SseUpdate | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return parsed as SseUpdate;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Which TanStack Query prefixes an SSE event invalidates. Pure + exported so the mapping is
 * unit-testable in the node test environment. The contract: an event says WHAT changed, never
 * the values — every invalidation refetches the authoritative API.
 */
export function invalidationsFor(type: SseEventType): string[][] {
  switch (type) {
    case "progress.updated":
      return [["progress-context"]];
    case "leaderboard.updated":
      return [["leaderboard"], ["my-standing"], ["public-leaderboard-preview"]];
    case "connected":
    case "update":
    default:
      // On connect (and for unknown/generic events) refresh the authoritative progression
      // and board state — cheap idempotent refetches, never local mutations.
      return [
        ["progress-context"],
        ["leaderboard"],
        ["my-standing"],
        ["public-leaderboard-preview"],
      ];
  }
}

export function useRealtimeUpdates(enabled: boolean): { connected: boolean } {
  const queryClient = useQueryClient();
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (AUTH_MODE !== "backend" || !enabled) return;

    let source: EventSource | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const invalidate = (type: SseEventType) => {
      // "Something changed" → refetch authoritative state. Never use payload values.
      for (const key of invalidationsFor(type)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const open = async () => {
      if (cancelled) return;
      try {
        const ticket = await getSseTicketFromApi();
        if (cancelled) return;
        source = new EventSource(`${SSE_PATH}?ticket=${encodeURIComponent(ticket)}`);
        attempt = 0;

        source.onopen = () => {
          if (!cancelled) setConnected(true);
        };

        // The backend frames are NAMED SSE events (`event: connected`, `event:
        // progress.updated`, ...). `onmessage` only fires for the default `message` type,
        // so we must register one listener per client-facing type. Unknown/generic frames
        // arrive as `update` (the backend maps them) and refetch progression + board.
        const TYPES: SseEventType[] = ["connected", "progress.updated", "leaderboard.updated", "update"];
        for (const type of TYPES) {
          source.addEventListener(type, (event) => {
            const update = parseEventData((event as MessageEvent).data);
            if (update) invalidate(update.type);
          });
        }

        source.onerror = () => {
          // EventSource will retry automatically; the single-use ticket means the retry URL
          // (same ticket) fails auth, so we must tear down and re-open with a fresh ticket.
          if (source) {
            source.close();
            source = null;
          }
          setConnected(false);
          if (cancelled) return;
          const delay = Math.min(
            BASE_RECONNECT_DELAY_MS * 2 ** attempt,
            MAX_RECONNECT_DELAY_MS,
          );
          attempt += 1;
          retryTimer = setTimeout(() => {
            if (!cancelled) void open();
          }, delay);
        };
      } catch {
        // Ticket fetch failed (e.g., backend momentarily down). Back off and retry; SSE is
        // an enhancement — the page still renders from the authoritative APIs.
        setConnected(false);
        if (cancelled) return;
        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * 2 ** attempt,
          MAX_RECONNECT_DELAY_MS,
        );
        attempt += 1;
        retryTimer = setTimeout(() => {
          if (!cancelled) void open();
        }, delay);
      }
    };

    void open();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (source) {
        source.close();
        source = null;
      }
      setConnected(false);
    };
  }, [queryClient, enabled]);

  return { connected };
}
