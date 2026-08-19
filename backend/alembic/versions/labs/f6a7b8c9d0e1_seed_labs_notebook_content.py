"""seed labs notebook content (B6)

Revision ID: f6a7b8c9d0e1
Revises: f0e1d2c3b4a5
Create Date: 2026-08-18 12:00:00.000000

Seeds three notebook-enabled labs with a published v1 manifest (markdown + code cells), so the
catalog detail route returns a `notebook` and the notebook routes have something to pin a
session against. Deterministic UUIDs + stable slugs keep the seed byte-for-byte reproducible
(mirrors the league-tier seed in da96596d5d83); content is immutable once published — a later
edit is a NEW version, never an in-place mutation.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: str | Sequence[str] | None = "f0e1d2c3b4a5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_UUID = postgresql.UUID(as_uuid=True)

_LAB_1_ID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000001"
_LAB_2_ID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000002"
_LAB_3_ID = "3b3b3b3b-3b3b-4b3b-8b3b-000000000003"

_LAB_1_VERSION = "3b3b3b3b-3b3b-4b3b-8b3c-000000000001"
_LAB_2_VERSION = "3b3b3b3b-3b3b-4b3b-8b3c-000000000002"
_LAB_3_VERSION = "3b3b3b3b-3b3b-4b3b-8b3c-000000000003"

_LAB_1_SECTION_1 = "3b3b3b3b-3b3b-4b3b-8b3d-000000000001"
_LAB_1_SECTION_2 = "3b3b3b3b-3b3b-4b3b-8b3d-000000000002"
_LAB_2_SECTION_1 = "3b3b3b3b-3b3b-4b3b-8b3d-000000000003"
_LAB_2_SECTION_2 = "3b3b3b3b-3b3b-4b3b-8b3d-000000000004"
_LAB_3_SECTION_1 = "3b3b3b3b-3b3b-4b3b-8b3d-000000000005"
_LAB_3_SECTION_2 = "3b3b3b3b-3b3b-4b3b-8b3d-000000000006"


def _labs() -> list[dict[str, object]]:
    return [
        {
            "id": _LAB_1_ID,
            "slug": "intro-to-python",
            "title": "Intro to Python",
            "category": "python",
            "difficulty": "beginner",
            "description": (
                "A gentle first notebook: print a message, use variables, loop, "
                "and write a function."
            ),
            "estimated_minutes": 30,
            "requires_gui": False,
            "hard_timeout_minutes": 60,
        },
        {
            "id": _LAB_2_ID,
            "slug": "python-data-wrangling",
            "title": "Python Data Wrangling",
            "category": "python",
            "difficulty": "intermediate",
            "description": (
                "Lists, dicts, and comprehensions: summarize, transform, and "
                "group small datasets."
            ),
            "estimated_minutes": 45,
            "requires_gui": False,
            "hard_timeout_minutes": 90,
        },
        {
            "id": _LAB_3_ID,
            "slug": "python-pandas-basics",
            "title": "Pandas Basics",
            "category": "data_science",
            "difficulty": "intermediate",
            "description": (
                "Load a frame, inspect it, filter rows, and aggregate by group "
                "with pandas."
            ),
            "estimated_minutes": 60,
            "requires_gui": False,
            "hard_timeout_minutes": 90,
        },
    ]


def _objectives() -> list[dict[str, object]]:
    return [
        {
            "id": "hello-world",
            "lab_id": _LAB_1_ID,
            "title": "Print your first message",
            "description": "Run the cell and print Hello, World!.",
            "hints": [
                "Use the built-in print function.",
                "print takes one or more arguments.",
            ],
            "requires_terminal": False,
            "position": 0,
        },
        {
            "id": "variables",
            "lab_id": _LAB_1_ID,
            "title": "Assign and print variables",
            "description": "Create name and year variables and print them.",
            "hints": [
                "Use the = operator to assign.",
                "Separate arguments to print with commas.",
            ],
            "requires_terminal": False,
            "position": 1,
        },
        {
            "id": "loops",
            "lab_id": _LAB_1_ID,
            "title": "Sum with a for loop",
            "description": "Add the integers 1 through 5 and print the total.",
            "hints": [
                "range(1, 6) yields 1..5.",
                "Accumulate into a running total.",
            ],
            "requires_terminal": False,
            "position": 2,
        },
        {
            "id": "greet",
            "lab_id": _LAB_1_ID,
            "title": "Write a greet function",
            "description": "Define a function that greets a name and call it.",
            "hints": [
                "def greet(name): ...",
                'Return an f-string like f"Hello, {name}!"',
            ],
            "requires_terminal": False,
            "position": 3,
        },
        {
            "id": "summarize",
            "lab_id": _LAB_2_ID,
            "title": "Summarize a list",
            "description": "Print the length, min, max, and sum of the sales list.",
            "hints": [
                "len, min, max and sum are built-ins.",
                "Print them as a tuple of values.",
            ],
            "requires_terminal": False,
            "position": 0,
        },
        {
            "id": "comprehension",
            "lab_id": _LAB_2_ID,
            "title": "Use a list comprehension",
            "description": "Build a list of the squares of the even numbers 1..10.",
            "hints": [
                "[n * n for n in numbers if n % 2 == 0]",
                "Remember the filter clause comes last.",
            ],
            "requires_terminal": False,
            "position": 1,
        },
        {
            "id": "groupby",
            "lab_id": _LAB_2_ID,
            "title": "Group a dataset by key",
            "description": "Aggregate per-person totals from a list of (name, value) pairs.",
            "hints": [
                "Use a dict with dict.get(name, 0) + value.",
                "Iterate the records once.",
            ],
            "requires_terminal": False,
            "position": 2,
        },
        {
            "id": "import-pandas",
            "lab_id": _LAB_3_ID,
            "title": "Import pandas",
            "description": "Import pandas and print its version.",
            "hints": [
                "import pandas as pd",
                "pandas exposes __version__.",
            ],
            "requires_terminal": False,
            "position": 0,
        },
        {
            "id": "inspect-frame",
            "lab_id": _LAB_3_ID,
            "title": "Inspect a frame",
            "description": "Build a small frame and print its shape and columns.",
            "hints": [
                "pd.DataFrame({...}) from a dict of lists.",
                ".shape is a (rows, cols) tuple.",
            ],
            "requires_terminal": False,
            "position": 1,
        },
        {
            "id": "filter-group",
            "lab_id": _LAB_3_ID,
            "title": "Filter and aggregate",
            "description": "Keep rows with score >= 90, then print the mean score per team.",
            "hints": [
                "Boolean mask: df[df.score >= 90].",
                "df.groupby('team').score.mean()",
            ],
            "requires_terminal": False,
            "position": 2,
        },
    ]


def _versions() -> list[dict[str, object]]:
    return [
        {"id": _LAB_1_VERSION, "lab_id": _LAB_1_ID, "version": 1, "status": "published"},
        {"id": _LAB_2_VERSION, "lab_id": _LAB_2_ID, "version": 1, "status": "published"},
        {"id": _LAB_3_VERSION, "lab_id": _LAB_3_ID, "version": 1, "status": "published"},
    ]


def _sections() -> list[dict[str, object]]:
    return [
        {
            "id": _LAB_1_SECTION_1,
            "version_id": _LAB_1_VERSION,
            "title": "Hello, Python",
            "position": 0,
        },
        {
            "id": _LAB_1_SECTION_2,
            "version_id": _LAB_1_VERSION,
            "title": "Control flow",
            "position": 1,
        },
        {
            "id": _LAB_2_SECTION_1,
            "version_id": _LAB_2_VERSION,
            "title": "Lists & dicts",
            "position": 0,
        },
        {
            "id": _LAB_2_SECTION_2,
            "version_id": _LAB_2_VERSION,
            "title": "Grouping",
            "position": 1,
        },
        {
            "id": _LAB_3_SECTION_1,
            "version_id": _LAB_3_VERSION,
            "title": "Setup",
            "position": 0,
        },
        {
            "id": _LAB_3_SECTION_2,
            "version_id": _LAB_3_VERSION,
            "title": "Analyze",
            "position": 1,
        },
    ]


def _cells() -> list[dict[str, object]]:
    rows = [
        {
            "section_id": _LAB_1_SECTION_1,
            "cell_type": "markdown",
            "content": (
                "# Welcome\n\n"
                "Run the cell below to print your first message. Every code cell "
                "runs in an isolated sandbox, and the lab completes once all code "
                "cells have succeeded."
            ),
            "position": 0,
        },
        {
            "section_id": _LAB_1_SECTION_1,
            "cell_type": "code",
            "content": 'print("Hello, World!")',
            "position": 1,
        },
        {
            "section_id": _LAB_1_SECTION_1,
            "cell_type": "markdown",
            "content": (
                "## Variables\n\n"
                "Assignments use `=` and need no type annotation. Try changing "
                "the values below."
            ),
            "position": 2,
        },
        {
            "section_id": _LAB_1_SECTION_1,
            "cell_type": "code",
            "content": 'name = "Ada"\nyear = 2026\nprint(name, year)',
            "position": 3,
        },
        {
            "section_id": _LAB_1_SECTION_2,
            "cell_type": "markdown",
            "content": (
                "## Control flow\n\n"
                "`for` loops iterate over a `range`. Accumulate a total below."
            ),
            "position": 0,
        },
        {
            "section_id": _LAB_1_SECTION_2,
            "cell_type": "code",
            "content": (
                "total = 0\n"
                "for i in range(1, 6):\n"
                "    total += i\n"
                "print(total)"
            ),
            "position": 1,
        },
        {
            "section_id": _LAB_1_SECTION_2,
            "cell_type": "code",
            "content": (
                'def greet(name: str) -> str:\n'
                '    return f"Hello, {name}!"\n'
                '\n'
                'print(greet("Ada"))'
            ),
            "position": 2,
        },
        {
            "section_id": _LAB_2_SECTION_1,
            "cell_type": "markdown",
            "content": (
                "# Data wrangling\n\n"
                "Small datasets are plain Python lists and dicts. Start by "
                "summarizing a list."
            ),
            "position": 0,
        },
        {
            "section_id": _LAB_2_SECTION_1,
            "cell_type": "code",
            "content": (
                "sales = [120, 340, 210, 455]\n"
                "print(len(sales), min(sales), max(sales), sum(sales))"
            ),
            "position": 1,
        },
        {
            "section_id": _LAB_2_SECTION_1,
            "cell_type": "code",
            "content": (
                "numbers = list(range(1, 11))\n"
                "squares = [n * n for n in numbers if n % 2 == 0]\n"
                "print(squares)"
            ),
            "position": 2,
        },
        {
            "section_id": _LAB_2_SECTION_2,
            "cell_type": "markdown",
            "content": (
                "## Grouping\n\n"
                "Aggregate a list of (name, value) pairs into per-name totals "
                "with a dict."
            ),
            "position": 0,
        },
        {
            "section_id": _LAB_2_SECTION_2,
            "cell_type": "code",
            "content": (
                'records = [("alice", 3), ("bob", 5), ("alice", 2)]\n'
                "totals = {}\n"
                "for name, value in records:\n"
                "    totals[name] = totals.get(name, 0) + value\n"
                "print(totals)"
            ),
            "position": 1,
        },
        {
            "section_id": _LAB_3_SECTION_1,
            "cell_type": "markdown",
            "content": (
                "# Pandas basics\n\n"
                "pandas is preinstalled in the sandbox. Import it first — later "
                "cells rely on it."
            ),
            "position": 0,
        },
        {
            "section_id": _LAB_3_SECTION_1,
            "cell_type": "code",
            "content": "import pandas as pd\nprint(pd.__version__)",
            "position": 1,
        },
        {
            "section_id": _LAB_3_SECTION_2,
            "cell_type": "markdown",
            "content": (
                "## Analyze\n\n"
                "Build a frame, inspect its shape, then filter and aggregate it."
            ),
            "position": 0,
        },
        {
            "section_id": _LAB_3_SECTION_2,
            "cell_type": "code",
            "content": (
                "import pandas as pd\n"
                'df = pd.DataFrame({"name": ["ada", "grace", "alan"], '
                '"score": [95, 88, 91]})\n'
                "print(df.shape)\n"
                "print(df.columns.tolist())"
            ),
            "position": 1,
        },
        {
            "section_id": _LAB_3_SECTION_2,
            "cell_type": "code",
            "content": (
                "import pandas as pd\n"
                'df = pd.DataFrame({"name": ["ada", "grace", "alan"], '
                '"team": ["a", "a", "b"], "score": [95, 88, 91]})\n'
                "print(df[df.score >= 90])\n"
                'print(df.groupby("team").score.mean().to_dict())'
            ),
            "position": 2,
        },
    ]
    return [
        {"id": f"3b3b3b3b-3b3b-4b3b-8b3f-{i:012d}", **row}
        for i, row in enumerate(rows, start=1)
    ]


def upgrade() -> None:
    op.bulk_insert(
        sa.table(
            "lab",
            sa.column("id", _UUID),
            sa.column("slug", sa.String()),
            sa.column("title", sa.String()),
            sa.column("category", sa.String()),
            sa.column("difficulty", sa.String()),
            sa.column("description", sa.Text()),
            sa.column("estimated_minutes", sa.Integer()),
            sa.column("requires_gui", sa.Boolean()),
            sa.column("hard_timeout_minutes", sa.Integer()),
        ),
        _labs(),
    )
    op.bulk_insert(
        sa.table(
            "lab_objective",
            sa.column("id", sa.String()),
            sa.column("lab_id", _UUID),
            sa.column("title", sa.String()),
            sa.column("description", sa.Text()),
            sa.column("hints", postgresql.ARRAY(sa.Text())),
            sa.column("requires_terminal", sa.Boolean()),
            sa.column("position", sa.Integer()),
        ),
        _objectives(),
    )
    op.bulk_insert(
        sa.table(
            "lab_version",
            sa.column("id", _UUID),
            sa.column("lab_id", _UUID),
            sa.column("version", sa.Integer()),
            sa.column("status", sa.String()),
        ),
        _versions(),
    )
    op.bulk_insert(
        sa.table(
            "lab_section",
            sa.column("id", _UUID),
            sa.column("version_id", _UUID),
            sa.column("title", sa.String()),
            sa.column("position", sa.Integer()),
        ),
        _sections(),
    )
    op.bulk_insert(
        sa.table(
            "lab_cell",
            sa.column("id", _UUID),
            sa.column("section_id", _UUID),
            sa.column("cell_type", sa.String()),
            sa.column("content", sa.Text()),
            sa.column("position", sa.Integer()),
        ),
        _cells(),
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM lab WHERE slug IN (:s1, :s2, :s3)"),
        {"s1": "intro-to-python", "s2": "python-data-wrangling", "s3": "python-pandas-basics"},
    )