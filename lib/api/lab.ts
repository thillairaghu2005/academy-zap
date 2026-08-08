import type {
  Lab,
  LabPreviewSession,
  LabSession,
  LabSessionCompletedEvent,
  ObjectiveResult,
} from "@/lib/contracts/lab";
import {
  jsonBody,
  requestJson,
  requestVoid,
  segment,
  withQuery,
} from "@/lib/api/client";

export async function listLabs(): Promise<Lab[]> {
  return requestJson<Lab[]>("/api/labs/catalog");
}

export async function searchLabs(query: string): Promise<Lab[]> {
  return requestJson<Lab[]>(withQuery("/api/labs/catalog", { query }));
}

export async function getLab(labId: string): Promise<Lab> {
  return requestJson<Lab>(`/api/labs/${segment(labId)}`);
}

export async function provisionSession(
  labId: string,
  userId: string,
): Promise<LabSession> {
  void userId;
  return requestJson<LabSession>(
    `/api/labs/${segment(labId)}/sessions`,
    jsonBody({}),
  );
}

export async function provisionPreviewSession(
  labId: string,
): Promise<LabPreviewSession> {
  return requestJson<LabPreviewSession>(
    `/api/labs/${segment(labId)}/preview-session`,
    jsonBody({}),
  );
}

export async function getSession(sessionId: string): Promise<LabSession> {
  return requestJson<LabSession>(`/api/labs/sessions/${segment(sessionId)}`);
}

export async function terminateSession(sessionId: string): Promise<void> {
  return requestVoid(`/api/labs/sessions/${segment(sessionId)}`, {
    method: "DELETE",
  });
}

export async function checkObjective(
  sessionId: string,
  objectiveId: string,
): Promise<ObjectiveResult> {
  return requestJson<ObjectiveResult>(
    `/api/labs/sessions/${segment(sessionId)}/objectives/${segment(objectiveId)}/check`,
    jsonBody({}),
  );
}

export async function requestHint(sessionId: string): Promise<string> {
  return requestJson<string>(
    `/api/labs/sessions/${segment(sessionId)}/hint`,
    jsonBody({}),
  );
}

export async function completeSession(
  sessionId: string,
): Promise<LabSessionCompletedEvent> {
  return requestJson<LabSessionCompletedEvent>(
    `/api/labs/sessions/${segment(sessionId)}/complete`,
    jsonBody({}),
  );
}
