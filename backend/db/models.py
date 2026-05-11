from typing import Optional
from sqlmodel import Field, SQLModel

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