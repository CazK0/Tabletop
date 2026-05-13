import random
from pydantic import BaseModel
from db.models import Character


class AttackResult(BaseModel):
    attacker_name: str
    defender_name: str
    roll: int
    modifier: int
    total_attack: int
    is_hit: bool
    is_critical: bool
    damage_dealt: int
    defender_remaining_hp: int
    is_fatal: bool
    ai_context_string: str


class CombatEngine:
    @staticmethod
    def calculate_modifier(stat: int) -> int:
        return (stat - 10) // 2

    @staticmethod
    def calculate_ac(dexterity: int) -> int:
        return 10 + CombatEngine.calculate_modifier(dexterity)

    @staticmethod
    def execute_attack(attacker: Character, defender: Character, weapon_die: int = 8) -> AttackResult:
        d20_roll = random.randint(1, 20)
        str_mod = CombatEngine.calculate_modifier(attacker.strength)
        total_attack = d20_roll + str_mod

        defender_ac = CombatEngine.calculate_ac(defender.dexterity)

        is_critical = d20_roll == 20
        is_hit = is_critical or total_attack >= defender_ac

        damage = 0
        if is_hit:
            damage_roll = random.randint(1, weapon_die)
            if is_critical:
                damage_roll += random.randint(1, weapon_die)
            damage = max(1, damage_roll + str_mod)

        defender.current_hp -= damage
        is_fatal = defender.current_hp <= 0

        if is_fatal:
            defender.current_hp = 0
            defender.is_alive = False

        context = (f"{attacker.name} rolled {d20_roll} (+{str_mod}). "
                   f"{'Critical hit!' if is_critical else 'Hit.' if is_hit else 'Miss.'} "
                   f"Dealt {damage} damage. {defender.name} HP: {defender.current_hp}. "
                   f"{'Fatal blow.' if is_fatal else ''}")

        return AttackResult(
            attacker_name=attacker.name,
            defender_name=defender.name,
            roll=d20_roll,
            modifier=str_mod,
            total_attack=total_attack,
            is_hit=is_hit,
            is_critical=is_critical,
            damage_dealt=damage,
            defender_remaining_hp=defender.current_hp,
            is_fatal=is_fatal,
            ai_context_string=context.strip()
        )