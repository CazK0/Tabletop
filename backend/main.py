from fastapi import FastAPI
from contextlib import asynccontextmanager
from db.connection import init_db
from db.models import Character
import asyncpg
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
app = FastAPI(lifespan=lifespan)
@app.post("/characters/")
async def create_character(character: Character):
    conn = await asyncpg.connect(
        user='postgres',
        password=os.getenv('POSTGRES_PASSWORD'),
        database='rpg_world',
        host='localhost',
        port=5432
    )
    try:
        row = await conn.fetchrow('''
                                  INSERT INTO characters (name, level, current_hp, max_hp, strength, dexterity, inventory, is_alive)
                                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
                                  ''', character.name, character.level, character.current_hp, character.max_hp,
                                  character.strength, character.dexterity, character.inventory, character.is_alive)

        character.id = row['id']
        return character
    finally:
        await conn.close()