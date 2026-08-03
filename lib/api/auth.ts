import type {
  LoginInput,
  RegisterInput,
  SessionState,
} from "@/lib/contracts/session";
import { MOCK_ADMIN, MOCK_LEARNER } from "@/lib/mocks/users";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";

/**
 * Mock auth API (Platform Core will own real auth later).
 *
 * Signatures are network-shaped and identical to what the future
 * `/auth/*` endpoints expose, so the SessionProvider can be rewired to a
 * real `fetch` with zero component changes (build.md §4).
 *
 * Mock rules (deterministic, demoable):
 *  - `getSession()` auto-authenticates the demo learner so the shell is
 *    explorable immediately. Logging out within a page load switches to the
 *    anonymous state; a refresh re-enters the demo session.
 *  - `login()` rejects passwords shorter than 8 chars (server-side rule)
 *    and emails ending in `@error.zapsters.dev` with `invalid_credentials`
 *    — the latter is how the login error state is exercised in the UI
 *    (short passwords are already blocked by client zod validation).
 *  - Email ending in `@admin.zapsters.dev` signs in the mock admin
 *    (exercises the role-gated Admin nav).
 */

export async function getSession(): Promise<SessionState> {
  await delay(jitter(350));
  return { status: "authenticated", user: MOCK_LEARNER };
}

export async function login(input: LoginInput): Promise<SessionState> {
  await delay(jitter(650));
  // Server-side rule: short passwords are invalid, even if the client
  // form already enforces the same minimum.
  if (input.password.length < 8) {
    throw new MockApiError(
      "invalid_credentials",
      "Invalid email or password.",
      401,
    );
  }
  // Deterministic demo hook: this email passes zod but is rejected by the
  // mock backend, exercising the login error state end-to-end.
  if (input.email.endsWith("@error.zapsters.dev")) {
    throw new MockApiError(
      "invalid_credentials",
      "Invalid email or password.",
      401,
    );
  }
  if (input.email.endsWith("@admin.zapsters.dev")) {
    return { status: "authenticated", user: MOCK_ADMIN };
  }
  return { status: "authenticated", user: MOCK_LEARNER };
}

export async function register(input: RegisterInput): Promise<SessionState> {
  await delay(jitter(800));
  if (input.password.length < 8) {
    throw new MockApiError(
      "weak_password",
      "Password must be at least 8 characters.",
      422,
    );
  }
  if (input.email === "taken@zapsters.dev") {
    throw new MockApiError("email_taken", "An account with this email already exists.", 409);
  }
  return { status: "authenticated", user: MOCK_LEARNER };
}

export async function logout(): Promise<void> {
  await delay(jitter(250));
}
