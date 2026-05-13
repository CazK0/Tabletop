import aiosqlite

async def init_db():
    async with aiosqlite.connect('rpg_world.db') as db:
        await db.execute('''
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
        ''')
        await db.commit()
        print("Database connection successful. 'characters' table ready.")