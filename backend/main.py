import json
from contextlib import asynccontextmanager

import aiosqlite
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_engine import NarrationRequest, get_dm
from db.connection import DATABASE_PATH, init_db
from db.models import Character
from game_logic import AttackResult, CombatEngine


def _character_from_row(row: aiosqlite.Row) -> Character:
    data = dict(row)
    raw = data.get("inventory")
    data["inventory"] = json.loads(raw) if raw else []
    return Character(**data)


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

        await db.execute('''
            UPDATE characters 
            SET current_hp = ?, is_alive = ? 
            WHERE id = ?
        ''', (defender.current_hp, defender.is_alive, defender.id))
        await db.commit()

        return result

@app.post("/combat/narrate")
async def narrate_combat(request: NarrationRequest):
    try:
        raw = get_dm().generate_combat_narration(request.context)
        text = raw.strip() if isinstance(raw, str) else str(raw).strip()
        return {"narration": text}
    except Exception:
        return {"narration": request.context.strip()}