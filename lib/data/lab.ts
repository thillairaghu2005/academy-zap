import { z } from "zod";

import { apiRequest } from "@/lib/api/client";
import type { Lab } from "@/lib/contracts/lab";
import type {
  CellExecutionAccepted,
  CheckpointResult,
  LabCompleteResult,
  LabDetail,
  LabProgress,
  LabProgressSaveResult,
} from "@/lib/contracts/lab-notebook";
import {
  apiCellExecutionAcceptedSchema,
  apiCheckpointResultSchema,
  apiLabCompleteResultSchema,
  apiLabDetailSchema,
  apiLabProgressSaveResultSchema,
  apiLabProgressSchema,
  apiLabSchema,
} from "@/lib/api/contracts";

/**
 * Real-API lab engine client (B6). Signatures mirror the demo engine's so the
 * facade (`lib/data/lab-facade.ts`) can switch by `DEMO_MODE`.
 *
 * Catalog: slug-first detail via `LabDetail` (the B6 slug contract AND the
 * foundation UUID contract resolve on one route). Notebook: progress,
 * debounced autosave, async cell execution (202 + poll), checkpoints, and the
 * completion gate — execution is NEVER inline (platform §5).
 */

export async function listLabs(): Promise<Lab[]> {
  return apiRequest("/labs", z.array(apiLabSchema));
}

/** Catalog search — Meilisearch-shaped (the docs pin self-hosted Meilisearch,
 * §2.1). Empty query returns the whole catalog; the platform list endpoint is
 * the source of truth and term filtering happens client-side like courses. */
export async function searchLabs(query: string): Promise<Lab[]> {
  const labs = await listLabs();
  const q = query.trim().toLowerCase();
  if (!q) return labs;
  return labs.filter((lab) =>
    [lab.title, lab.category, lab.description]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export async function getLab(identifier: string): Promise<LabDetail> {
  return apiRequest(`/labs/${encodeURIComponent(identifier)}`, apiLabDetailSchema);
}

/** Reads (and lazily creates) the learner's progress row for this lab. */
export async function getProgress(identifier: string): Promise<LabProgress> {
  return apiRequest(
    `/labs/${encodeURIComponent(identifier)}/progress`,
    apiLabProgressSchema,
  );
}

/** Debounced autosave of the learner's cell sources. */
export async function saveProgress(
  identifier: string,
  code: Record<string, string>,
): Promise<LabProgressSaveResult> {
  return apiRequest(
    `/labs/${encodeURIComponent(identifier)}/progress`,
    apiLabProgressSaveResultSchema,
    { method: "PUT", body: JSON.stringify({ code }) },
  );
}

/** Enqueues a cell run and answers 202 with the execution handle. */
export async function executeCell(
  identifier: string,
  cellId: string,
  code?: string,
): Promise<CellExecutionAccepted> {
  return apiRequest(
    `/labs/${encodeURIComponent(identifier)}/cell/execute`,
    apiCellExecutionAcceptedSchema,
    {
      method: "POST",
      body: JSON.stringify(code === undefined ? { cell_id: cellId } : { cell_id: cellId, code }),
    },
  );
}

/** Snapshots the current cell sources as a named checkpoint. */
export async function createCheckpoint(
  identifier: string,
  label = "",
): Promise<CheckpointResult> {
  return apiRequest(
    `/labs/${encodeURIComponent(identifier)}/checkpoint`,
    apiCheckpointResultSchema,
    { method: "POST", body: JSON.stringify({ label }) },
  );
}

/** Completes the lab once every code cell has succeeded (409 otherwise). */
export async function completeLab(identifier: string): Promise<LabCompleteResult> {
  return apiRequest(
    `/labs/${encodeURIComponent(identifier)}/complete`,
    apiLabCompleteResultSchema,
    { method: "POST" },
  );
}

/**
 * Terminal sessions (provision/terminate/check-objective) are the F3 surface
 * and stay on the demo service — B6 notebook labs have no provision flow. These
 * stubs keep the facade signature-compatible; a caller only reaches them for a
 * lab without a notebook, which real-mode never publishes.
 */

function notSupported(): never {
  throw new Error("Notebook labs do not provision terminal sessions.");
}

export async function provisionSession(_labId: string, _userId: string): Promise<never> {
  return notSupported();
}

export async function provisionPreviewSession(_labId: string): Promise<never> {
  return notSupported();
}