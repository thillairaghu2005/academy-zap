/**
 * B6 — notebook engine contracts (mirror of `platform_core.contracts.labs`).
 *
 * The foundation `lib/contracts/lab.ts` is locked by the docs (§4.1/§4.3/§6)
 * and is untouched. These shapes are the notebook layer added by B6: the
 * published versioned manifest (`LabVersionView`), the learner's progress row
 * (`LabProgress`), and the async cell-execution result surfaces. They live in
 * their own file so the locked terminal-session contracts stay exactly as the
 * docs pin them.
 *
 * Status literals match the backend enums 1:1 (`CellExecutionState.status`,
 * `LabProgress.status`). `not_run` is the IMPLICIT state for cells with no
 * execution row yet — such cells are simply absent from `outputs`.
 */

import type { Lab } from "./lab";

export interface LabCellView {
  id: string;
  cell_type: "markdown" | "code";
  content: string;
  position: number;
}

export interface LabSectionView {
  id: string;
  title: string;
  position: number;
  cells: LabCellView[];
}

export interface LabVersionView {
  version: number;
  sections: LabSectionView[];
}

/** A lab's catalog card plus its published notebook manifest, if one exists. */
export type LabDetail = Lab & {
  notebook: LabVersionView | null;
};

export type CellExecutionStatus =
  | "not_run"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "error";

/** Latest execution state for one cell in a learner's session. */
export interface CellExecutionState {
  execution_id: string | null;
  status: CellExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  exit_code: number | null;
  runtime_ms: number | null;
  memory_kb: number | null;
  error: string | null;
  executed_at: string | null;
  updated_at: string | null;
}

export interface LabProgress {
  progress_id: string;
  lab_id: string;
  version: number;
  user_id: string;
  status: "in_progress" | "completed";
  /** Autosaved cell sources keyed by cell id. */
  code: Record<string, string>;
  /** Latest execution state per cell id — cells never run are absent. */
  outputs: Record<string, CellExecutionState>;
  hints_used: number;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CellExecutionAccepted {
  execution_id: string;
  cell_id: string;
  status: "queued";
  received_at: string;
}

export interface LabProgressSaveResult {
  progress_id: string;
  updated_at: string;
}

export interface CheckpointResult {
  checkpoint_id: string;
  created_at: string;
}

export interface LabCompleteResult {
  lab_id: string;
  session_id: string;
  objectives_completed: string[];
  time_taken_seconds: number;
  hints_used: number;
}

export function isTerminalExecution(state: CellExecutionState | undefined): boolean {
  if (!state) return false;
  return (
    state.status === "succeeded" ||
    state.status === "failed" ||
    state.status === "error"
  );
}