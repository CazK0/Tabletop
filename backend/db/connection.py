import json
from pathlib import Path

import aiosqlite

DATABASE_PATH = Path(__file__).resolve().parent.parent / "rpg_world.db"


async def _ensure_demo_characters(db: aiosqlite.Connection) -> None:
    rows = [
        (1, "Arthur", 1, 30, 30, 16, 14, json.dumps(["Longsword"]), 1),
        (2, "Gorgon", 1, 40, 40, 14, 12, json.dumps(["Club"]), 1),
    ]
    for r in rows:
        await db.execute(
            """
            INSERT OR IGNORE INTO characters
            (id, name, level, current_hp, max_hp, strength, dexterity, inventory, is_alive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            r,
        )


async def _ensure_demo_inventories(db: aiosqlite.Connection) -> None:
    patches = [
        (1, json.dumps(["Longsword"])),
        (2, json.dumps(["Club"])),
    ]
    empty = json.dumps([])
    for char_id, inv in patches:
        await db.execute(
            """
            UPDATE characters
            SET inventory = ?
            WHERE id = ? AND (inventory IS NULL OR inventory = ? OR inventory = '[]')
            """,
            (inv, char_id, empty),
        )


async def init_db():
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                current_hp INTEGER NOT NULL,
                max_hp INTEGER NOT NULL,
                strength INTEGER NOT NULL,
                dexterity INTEGER NOT NULL,
                inventory TEXT,
                is_alive BOOLEAN DEFAULT 1
            );
            """
        )
        await _ensure_demo_characters(db)
        await _ensure_demo_inventories(db)
        await db.commit()
