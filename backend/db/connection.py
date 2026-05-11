import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()


async def init_db():
    conn = await asyncpg.connect(
        user='postgres',
        password=os.getenv('POSTGRES_PASSWORD'),
        database='rpg_world',
        host='localhost',
        port=5432
    )

    await conn.execute('''
                       CREATE TABLE IF NOT EXISTS characters
                       (
                           id SERIAL PRIMARY KEY, 
                           name VARCHAR(255) NOT NULL,
                           level INT DEFAULT 1,
                           current_hp INT NOT NULL,
                           max_hp INT NOT NULL,
                           strength INT NOT NULL,
                           dexterity INT NOT NULL,
                           inventory TEXT[],
                           is_alive BOOLEAN DEFAULT TRUE
                           );
                       ''')

    print("Database connection successful. 'characters' table ready.")
    await conn.close()