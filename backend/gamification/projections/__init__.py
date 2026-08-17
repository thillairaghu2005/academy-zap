"""Read-model projections over authoritative gamification state (gamification §2.4, §5.5).

The XP ledger remains the source of truth. Every projection in this package is cache-like,
rebuildable, and never a source of truth — "why is this leaderboard wrong" is answerable in one
place: replay the ledger.
"""
