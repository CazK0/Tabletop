from pydantic import BaseModel, Field
from typing import Optional, List

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