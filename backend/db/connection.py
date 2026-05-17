import json
from pathlib import Path

import aiosqlite

DATABASE_PATH = Path(__file__).resolve().parent.parent / "rpg_world.db"

DEMO_LOADOUTS: dict[int, list[str]] = {
    1: ["Longsword", "Chain Mail"],
    2: ["Club", "Hide Armor"],
}


async def _ensure_demo_characters(db: aiosqlite.Connection) -> None:
    rows = [
        (1, "Arthur", 1, 30, 30, 16, 14, json.dumps(DEMO_LOADOUTS[1]), 1),
        (2, "Gorgon", 1, 40, 40, 14, 12, json.dumps(DEMO_LOADOUTS[2]), 1),
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
    empty = json.dumps([])
    for char_id, loadout in DEMO_LOADOUTS.items():
        cursor = await db.execute(
            "SELECT inventory FROM characters WHERE id = ?",
            (char_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            continue
        raw = row[0]
        if raw is None or raw == empty or raw == "[]":
            await db.execute(
                "UPDATE characters SET inventory = ? WHERE id = ?",
                (json.dumps(loadout), char_id),
            )
            continue
        current = json.loads(raw)
        updated = list(current)
        changed = False
        for item in loadout:
            if not any(i.strip().lower() == item.lower() for i in updated):
                updated.append(item)
                changed = True
        if changed:
            await db.execute(
                "UPDATE characters SET inventory = ? WHERE id = ?",
                (json.dumps(updated), char_id),
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
