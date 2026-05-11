from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from sqlmodel import Session, select
from db.connection import create_db_and_tables, get_session
from db.models import Character, Item

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"status": "RPG Engine Online"}

@app.post("/characters/")
def create_character(character: Character, session: Session = Depends(get_session)):
    session.add(character)
    session.commit()
    session.refresh(character)
    return character

@app.get("/characters/")
def read_characters(session: Session = Depends(get_session)):
    characters = session.exec(select(Character)).all()
    return characters