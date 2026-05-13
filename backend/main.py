from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from db.connection import init_db
from db.models import Character
from pydantic import BaseModel
import aiosqlite
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from game_logic import CombatEngine, AttackResult
from ai_engine import dm_instance, NarrationRequest

from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
from db.connection import init_db
from db.models import Character
from pydantic import BaseModel
import aiosqlite
import json
from fastapi.middleware.cors import CORSMiddleware
from game_logic import CombatEngine, AttackResult
from ai_engine import dm_instance, NarrationRequest

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
    async with aiosqlite.connect('rpg_world.db') as db:
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


@app.post("/combat/attack", response_model=AttackResult)
async def execute_combat_turn(request: AttackRequest):
    async with aiosqlite.connect('rpg_world.db') as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute("SELECT * FROM characters WHERE id = ?", (request.attacker_id,))
        attacker_row = await cursor.fetchone()

        cursor = await db.execute("SELECT * FROM characters WHERE id = ?", (request.defender_id,))
        defender_row = await cursor.fetchone()

        if not attacker_row or not defender_row:
            raise HTTPException(status_code=404, detail="One or both characters not found.")

        a_dict = dict(attacker_row)
        a_dict['inventory'] = json.loads(a_dict['inventory']) if a_dict['inventory'] else []
        attacker = Character(**a_dict)

        d_dict = dict(defender_row)
        d_dict['inventory'] = json.loads(d_dict['inventory']) if d_dict['inventory'] else []
        defender = Character(**d_dict)

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
    story = dm_instance.generate_combat_narration(request.context)
    return {"narration": story.strip()}