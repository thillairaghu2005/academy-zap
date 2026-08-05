/**
 * Shared presentation helpers (F0/F1).
 *
 * `hueForId` deterministically maps any stable id string to a hue angle for
 * gradient cover art. It lives here (not in the mock layer) so components
 * never import from `lib/mocks/*` — the mock uses it too when building
 * catalog summaries, keeping the cover hues consistent across surfaces.
 */

export function hueForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}
