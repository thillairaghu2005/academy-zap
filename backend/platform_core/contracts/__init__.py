"""Protocol interfaces + shared Pydantic models (platform §4.1).

The frontend's `lib/contracts/*.ts` is the hand-transcribed mirror of this package plus
`gamification/context/schema.py` (build.md §7). Every subsystem's own `schemas/` module should
reuse these shapes rather than re-declaring them.
"""
