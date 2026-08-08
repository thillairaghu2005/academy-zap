/**
 * F8 public integration event contracts.
 *
 * These mirror the versioned event rules in the platform and gamification
 * architecture documents. Delivery, signing, retries, and dead-letter
 * handling belong to a future integration; the frontend only needs the stable shape.
 */

export interface BaseEvent {
  event_id: string;
  event_type: string;
  schema_version: number;
  user_id: string;
  org_id: string | null;
  occurred_at: string;
  idempotency_key: string;
  session_fingerprint: string;
  payload: Record<string, unknown>;
}

export interface EnrollmentEvent extends BaseEvent {
  event_type: "enrollment";
  course_id: string;
}

export interface CompletionEvent extends BaseEvent {
  event_type: "completion";
  course_id: string;
  category: string;
  time_spent_seconds: number;
  completion_pct: 100;
}

export interface CredentialIssuedEvent extends BaseEvent {
  event_type: "credential.issued";
  credential_id: string;
  credential_type: "badge" | "certificate";
}

export type PublicIntegrationEvent =
  | EnrollmentEvent
  | CompletionEvent
  | CredentialIssuedEvent;
