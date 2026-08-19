import { DEMO_MODE } from "@/lib/config";
import * as demoLab from "./demo/lab";
import * as realLab from "./lab";
import type { LabDetail } from "@/lib/contracts/lab-notebook";

export const listLabs = DEMO_MODE ? demoLab.listLabs : realLab.listLabs;
export const searchLabs = DEMO_MODE ? demoLab.searchLabs : realLab.searchLabs;

/** Demo labs have no published notebook — the facade pins `notebook: null` so
 * catalog/detail surfaces behave identically in both modes. */
const demoGetLab: typeof realLab.getLab = async (identifier) => {
  const lab = await demoLab.getLab(identifier);
  return { ...lab, notebook: null } satisfies LabDetail;
};

export const getLab = DEMO_MODE ? demoGetLab : realLab.getLab;
export const provisionSession = DEMO_MODE
  ? demoLab.provisionSession
  : realLab.provisionSession;
export const provisionPreviewSession = DEMO_MODE
  ? demoLab.provisionPreviewSession
  : realLab.provisionPreviewSession;

/**
 * Notebook engine calls (B6) are real-API only. Demo mode has no notebook
 * backend and the demo labs carry `notebook: null`, so the notebook route is
 * unreachable there; these throw a descriptive error as a safety net.
 */

const notebookUnavailable = () =>
  Promise.reject(
    new Error("The notebook engine is only available with the live backend."),
  );

export const getProgress = DEMO_MODE
  ? notebookUnavailable
  : realLab.getProgress;
export const saveProgress = DEMO_MODE
  ? notebookUnavailable
  : realLab.saveProgress;
export const executeCell = DEMO_MODE
  ? notebookUnavailable
  : realLab.executeCell;
export const createCheckpoint = DEMO_MODE
  ? notebookUnavailable
  : realLab.createCheckpoint;
export const completeLab = DEMO_MODE
  ? notebookUnavailable
  : realLab.completeLab;