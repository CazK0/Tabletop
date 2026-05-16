import random
from pydantic import BaseModel
from db.models import Character

WEAPON_DICE: dict[str, int] = {
    "longsword": 10,
    "greataxe": 12,
    "shortsword": 6,
    "dagger": 4,
    "club": 6,
    "mace": 6,
    "spear": 8,
}


class AttackResult(BaseModel):
    attacker_name: str
    defender_name: str
    roll: int
    modifier: int
    total_attack: int
    is_hit: bool
    is_critical: bool
    is_fumble: bool
    damage_dealt: int
    defender_remaining_hp: int
    is_fatal: bool
    weapon_name: str
    weapon_die: int
    ai_context_string: str


class RoundResult(BaseModel):
    hero_attack: AttackResult | None = None
    monster_attack: AttackResult | None = None
    hero_initiative: int
    monster_initiative: int
    first_attacker_name: str
    fight_over: bool
    winner_name: str | None = None
    ai_context_string: str


class CombatEngine:
    @staticmethod
    def calculate_modifier(stat: int) -> int:
        return (stat - 10) // 2

    @staticmethod
    def calculate_ac(dexterity: int) -> int:
        return 10 + CombatEngine.calculate_modifier(dexterity)

    @staticmethod
    def resolve_weapon(inventory: list[str]) -> tuple[int, str]:
        for item in inventory:
            key = item.strip().lower()
            if key in WEAPON_DICE:
                return WEAPON_DICE[key], item
        return 8, "Fists"

    @staticmethod
    def roll_initiative(character: Character) -> int:
        return random.randint(1, 20) + CombatEngine.calculate_modifier(character.dexterity)

    @staticmethod
    def execute_attack(attacker: Character, defender: Character) -> AttackResult:
        weapon_die, weapon_name = CombatEngine.resolve_weapon(attacker.inventory)
        d20_roll = random.randint(1, 20)
        str_mod = CombatEngine.calculate_modifier(attacker.strength)
        total_attack = d20_roll + str_mod
        defender_ac = CombatEngine.calculate_ac(defender.dexterity)

        is_critical = d20_roll == 20
        is_fumble = d20_roll == 1
        is_hit = (
            not is_fumble
            and (is_critical or total_attack >= defender_ac)
        )
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

        if is_fumble:
            hit_word = "Fumble"
        elif is_hit:
            hit_word = "Hit"
        else:
            hit_word = "Miss"
        context = (
            f"{attacker.name} with {weapon_name} rolled {d20_roll} (+{str_mod}). "
            f"{hit_word}. Dealt {damage} damage."
        )

        return AttackResult(
            attacker_name=attacker.name,
            defender_name=defender.name,
            roll=d20_roll,
            modifier=str_mod,
            total_attack=total_attack,
            is_hit=is_hit,
            is_critical=is_critical,
            is_fumble=is_fumble,
            damage_dealt=damage,
            defender_remaining_hp=defender.current_hp,
            is_fatal=is_fatal,
            weapon_name=weapon_name,
            weapon_die=weapon_die,
            ai_context_string=context,
        )

    @staticmethod
    def _monster_attacks_first(hero: Character, monster: Character, hero_init: int, monster_init: int) -> bool:
        if monster_init > hero_init:
            return True
        if monster_init < hero_init:
            return False
        return monster.dexterity > hero.dexterity

    @staticmethod
    def execute_round(hero: Character, monster: Character) -> RoundResult:
        hero_init = CombatEngine.roll_initiative(hero)
        monster_init = CombatEngine.roll_initiative(monster)
        monster_first = CombatEngine._monster_attacks_first(
            hero, monster, hero_init, monster_init,
        )
        first_name = monster.name if monster_first else hero.name

        hero_attack: AttackResult | None = None
        monster_attack: AttackResult | None = None
        context_parts: list[str] = []

        if monster_first:
            monster_attack = CombatEngine.execute_attack(monster, hero)
            context_parts.append(monster_attack.ai_context_string)
            if hero.is_alive:
                hero_attack = CombatEngine.execute_attack(hero, monster)
                context_parts.append(hero_attack.ai_context_string)
        else:
            hero_attack = CombatEngine.execute_attack(hero, monster)
            context_parts.append(hero_attack.ai_context_string)
            if monster.is_alive:
                monster_attack = CombatEngine.execute_attack(monster, hero)
                context_parts.append(monster_attack.ai_context_string)

        fight_over = not hero.is_alive or not monster.is_alive
        winner_name = None
        if fight_over:
            if hero.is_alive:
                winner_name = hero.name
            elif monster.is_alive:
                winner_name = monster.name

        return RoundResult(
            hero_attack=hero_attack,
            monster_attack=monster_attack,
            hero_initiative=hero_init,
            monster_initiative=monster_init,
            first_attacker_name=first_name,
            fight_over=fight_over,
            winner_name=winner_name,
            ai_context_string=" ".join(context_parts),
        )
