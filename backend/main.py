import json
from contextlib import asynccontextmanager

import aiosqlite
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_engine import NarrationRequest, get_dm
from db.connection import DATABASE_PATH, init_db
from db.models import Character
from game_logic import AttackResult, CombatEngine, RoundResult


def _character_from_row(row: aiosqlite.Row) -> Character:
    data = dict(row)
    raw = data.get("inventory")
    data["inventory"] = json.loads(raw) if raw else []
    return Character(**data)


async def _fetch_character_row(
    db: aiosqlite.Connection, character_id: int,
) -> aiosqlite.Row | None:
    db.row_factory = aiosqlite.Row
    cursor = await db.execute(
        "SELECT * FROM characters WHERE id = ?",
        (character_id,),
    )
    return await cursor.fetchone()


class CharacterUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    max_hp: int = Field(ge=1, le=999)
    strength: int = Field(ge=1, le=30)
    dexterity: int = Field(ge=1, le=30)
    inventory: list[str] = Field(default_factory=list)
    heal_to_full: bool = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AttackRequest(BaseModel):
    attacker_id: int
    defender_id: int


class RoundRequest(BaseModel):
    hero_id: int
    monster_id: int


class ResetRequest(BaseModel):
    character_ids: list[int] = [1, 2]


async def _save_character(db: aiosqlite.Connection, character: Character) -> None:
    await db.execute(
        "UPDATE characters SET current_hp = ?, is_alive = ? WHERE id = ?",
        (character.current_hp, character.is_alive, character.id),
    )

@app.post("/characters/")
async def create_character(character: Character):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        inventory_json = json.dumps(character.inventory)

        cursor = await db.execute('''
            INSERT INTO characters (name, level, current_hp, max_hp, strength, dexterity, inventory, is_alive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id;
        ''', (character.name, character.level, character.current_hp, character.max_hp,
              character.strength, character.dexterity, inventory_json, character.is_alive))

        row = await cursor.fetchone()
        await db.commit()

        character.id = row['id']
        return character


@app.get("/characters/")
async def get_characters():
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM characters")
        rows = await cursor.fetchall()
        return [_character_from_row(row) for row in rows]


@app.get("/characters/{character_id}", response_model=Character)
async def get_character(character_id: int):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        row = await _fetch_character_row(db, character_id)
        if not row:
            raise HTTPException(status_code=404, detail="Character not found.")
        return _character_from_row(row)


@app.put("/characters/{character_id}", response_model=Character)
async def update_character(character_id: int, payload: CharacterUpdate):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        row = await _fetch_character_row(db, character_id)
        if not row:
            raise HTTPException(status_code=404, detail="Character not found.")

        existing = _character_from_row(row)
        if payload.heal_to_full:
            current_hp = payload.max_hp
            is_alive = True
        else:
            current_hp = min(existing.current_hp, payload.max_hp)
            is_alive = existing.is_alive and current_hp > 0

        inventory_json = json.dumps(payload.inventory)
        await db.execute(
            """
            UPDATE characters
            SET name = ?, max_hp = ?, current_hp = ?, strength = ?,
                dexterity = ?, inventory = ?, is_alive = ?
            WHERE id = ?
            """,
            (
                payload.name.strip(),
                payload.max_hp,
                current_hp,
                payload.strength,
                payload.dexterity,
                inventory_json,
                is_alive,
                character_id,
            ),
        )
        await db.commit()

        updated = await _fetch_character_row(db, character_id)
        return _character_from_row(updated)


@app.delete("/characters/{character_id}")
async def delete_character(character_id: int):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        row = await _fetch_character_row(db, character_id)
        if not row:
            raise HTTPException(status_code=404, detail="Character not found.")
        await db.execute("DELETE FROM characters WHERE id = ?", (character_id,))
        await db.commit()
        return {"deleted": character_id}


@app.post("/combat/attack", response_model=AttackResult)
async def execute_combat_turn(request: AttackRequest):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("SELECT * FROM characters WHERE id = ?", (request.attacker_id,))
        attacker_row = await cursor.fetchone()

        cursor = await db.execute("SELECT * FROM characters WHERE id = ?", (request.defender_id,))
        defender_row = await cursor.fetchone()

        if not attacker_row or not defender_row:
            raise HTTPException(status_code=404, detail="One or both characters not found.")

        attacker = _character_from_row(attacker_row)
        defender = _character_from_row(defender_row)

        if not attacker.is_alive or not defender.is_alive:
            raise HTTPException(status_code=400, detail="Cannot execute attack. Someone is already dead.")

        result = CombatEngine.execute_attack(attacker, defender)

        await _save_character(db, defender)
        await db.commit()

        return result


@app.post("/combat/round", response_model=RoundResult)
async def execute_combat_round(request: RoundRequest):
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("SELECT * FROM characters WHERE id = ?", (request.hero_id,))
        hero_row = await cursor.fetchone()

        cursor = await db.execute("SELECT * FROM characters WHERE id = ?", (request.monster_id,))
        monster_row = await cursor.fetchone()

        if request.hero_id == request.monster_id:
            raise HTTPException(status_code=400, detail="Choose two different fighters.")

        if not hero_row or not monster_row:
            raise HTTPException(status_code=404, detail="One or both characters not found.")

        hero = _character_from_row(hero_row)
        monster = _character_from_row(monster_row)

        if not hero.is_alive or not monster.is_alive:
            raise HTTPException(
                status_code=400,
                detail="Fight is over. Reset the arena to fight again.",
            )

        result = CombatEngine.execute_round(hero, monster)

        await _save_character(db, hero)
        await _save_character(db, monster)
        await db.commit()

        return result


@app.post("/combat/reset")
async def reset_combat(request: ResetRequest):
    if not request.character_ids:
        raise HTTPException(status_code=400, detail="No characters to reset.")

    async with aiosqlite.connect(DATABASE_PATH) as db:
        placeholders = ",".join("?" * len(request.character_ids))
        await db.execute(
            f"""
            UPDATE characters
            SET current_hp = max_hp, is_alive = 1
            WHERE id IN ({placeholders})
            """,
            request.character_ids,
        )
        await db.commit()

    return {"reset": request.character_ids}


@app.post("/combat/narrate")
async def narrate_combat(request: NarrationRequest):
    try:
        raw = get_dm().generate_combat_narration(request.context)
        text = raw.strip() if isinstance(raw, str) else str(raw).strip()
        return {"narration": text}
    except Exception:
        return {"narration": request.context.strip()}