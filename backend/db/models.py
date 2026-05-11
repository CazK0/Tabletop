from sqlmodel import Field, SQLModel
from pydantic import BaseModel, Field
from typing import Optional, List

class Character(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    level: int = Field(default=1)
    hp_current: int = Field(default=10)
    hp_max: int = Field(default=10)
    strength: int = Field(default=10)
    dexterity: int = Field(default=10)
    intelligence: int = Field(default=10)
    character_class: str

class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str
    weight: float = Field(default=1.0)
    item_type: str = Field(index=True)


class Character(BaseModel):
    id: Optional[int] = None
    name: str
    level: int = 1
    current_hp: int
    max_hp: int
    strength: int
    dexterity: int
    inventory: List[str] = Field(default_factory=list)
    is_alive: bool = True