/**
 * Zapsters — contract layer
 * ==========================
 *
 * Contract-first discipline (build.md §0): every UI surface consumes the
 * exact contract shapes locked in the source docs
 * (`ZAPSTERS_PLATFORM_FULL_ARCHITECTURE.md` §4.1/§4.3 and
 * `ZAPSTERS_GAMIFICATION_ENGINE.md` §5.3). These files are the TypeScript
 * mirror of those Pydantic models, transcribed field-for-field.
 *
 * A mock is just an object satisfying these contracts with fixture data.
 * When the real backend lands, the swap is a `lib/api/*` body replacement —
 * component code never changes.
 *
 * /!\ ASSUMPTION REGISTER (provisional decisions, per working style):
 *   - session.ts : the docs do not lock a User/Profile schema (Platform Core
 *     owns auth). This minimal shell contract is provisional and will be
 *     reconciled with the real Platform Core schema during integration.
 */

export * from "./session";
