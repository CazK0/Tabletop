from fastapi import FastAPI
from contextlib import asynccontextmanager
from db.connection import init_db
from db.models import Character
import aiosqlite
import json


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)


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