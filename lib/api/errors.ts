/**
 * Mock API error — mirrors the error envelope the real backend will return
 * (FastAPI HTTPException shape). Components catch this and render the
 * ErrorState primitive; when the real fetch layer lands, the same catch
 * path keeps working.
 */

export class MockApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "MockApiError";
    this.code = code;
    this.status = status;
  }
}
