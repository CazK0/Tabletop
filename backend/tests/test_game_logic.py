from unittest.mock import patch

from db.models import Character
from game_logic import CombatEngine


def _char(name: str, hp: int, str_: int, dex: int, inventory: list[str] | None = None) -> Character:
    return Character(
        name=name,
        current_hp=hp,
        max_hp=hp,
        strength=str_,
        dexterity=dex,
        inventory=inventory or [],
        is_alive=True,
    )


def test_calculate_modifier():
    assert CombatEngine.calculate_modifier(10) == 0
    assert CombatEngine.calculate_modifier(16) == 3
    assert CombatEngine.calculate_modifier(8) == -1


def test_calculate_ac():
    assert CombatEngine.calculate_ac(14) == 12


def test_calculate_ac_with_armor():
    ac = CombatEngine.calculate_ac(14, ["Chain Mail", "Shield"])
    assert ac == 12 + 3 + 2


def test_resolve_armor_stacks_distinct_pieces():
    bonus, label = CombatEngine.resolve_armor(["Leather Armor", "Shield"])
    assert bonus == 3
    assert "Leather Armor" in label
    assert "Shield" in label


@patch("game_logic.random.randint")
def test_armor_increases_ac_and_can_cause_miss(mock_randint):
    mock_randint.side_effect = [12]
    attacker = _char("Hero", 30, 10, 10)
    defender = _char("Knight", 30, 10, 10, ["Plate Armor"])
    result = CombatEngine.execute_attack(attacker, defender)
    assert result.defender_ac == 10 + 5
    assert result.is_hit is False
    assert result.damage_dealt == 0


def test_resolve_weapon_longsword():
    die, name = CombatEngine.resolve_weapon(["Longsword"])
    assert die == 10
    assert name == "Longsword"


def test_resolve_weapon_fists():
    die, name = CombatEngine.resolve_weapon([])
    assert die == 8
    assert name == "Fists"


@patch("game_logic.random.randint")
def test_natural_one_always_misses(mock_randint):
    mock_randint.side_effect = [1]
    attacker = _char("Hero", 30, 16, 14, ["Longsword"])
    defender = _char("Goblin", 20, 10, 10)
    result = CombatEngine.execute_attack(attacker, defender)
    assert result.roll == 1
    assert result.is_fumble is True
    assert result.is_hit is False
    assert result.damage_dealt == 0
    assert defender.current_hp == 20


@patch("game_logic.random.randint")
def test_critical_hit_doubles_weapon_die(mock_randint):
    mock_randint.side_effect = [20, 4, 6]
    attacker = _char("Hero", 30, 16, 14)
    defender = _char("Goblin", 40, 10, 10)
    result = CombatEngine.execute_attack(attacker, defender)
    assert result.is_critical is True
    assert result.is_hit is True
    assert result.damage_dealt >= 1


@patch("game_logic.random.randint")
def test_hit_applies_damage(mock_randint):
    mock_randint.side_effect = [15, 5]
    attacker = _char("Hero", 30, 16, 14)
    defender = _char("Goblin", 20, 10, 10)
    result = CombatEngine.execute_attack(attacker, defender)
    assert result.is_hit is True
    assert result.damage_dealt > 0
    assert defender.current_hp < 20


@patch("game_logic.random.randint")
def test_fatal_attack_kills_defender(mock_randint):
    mock_randint.side_effect = [20, 8, 8]
    attacker = _char("Hero", 30, 20, 14)
    defender = _char("Goblin", 5, 10, 10)
    result = CombatEngine.execute_attack(attacker, defender)
    assert result.is_fatal is True
    assert defender.current_hp == 0
    assert defender.is_alive is False


@patch("game_logic.random.randint")
def test_round_skips_dead_counterattack(mock_randint):
    mock_randint.side_effect = [20, 10, 10]
    hero = _char("Hero", 30, 20, 14)
    monster = _char("Goblin", 4, 10, 10)
    result = CombatEngine.execute_round(hero, monster)
    assert result.hero_attack is not None
    assert result.monster_attack is None
    assert result.fight_over is True
    assert result.winner_name == "Hero"


@patch("game_logic.random.randint")
def test_initiative_monster_strikes_first(mock_randint):
    mock_randint.side_effect = [5, 18, 10, 3]
    hero = _char("Hero", 30, 10, 10)
    monster = _char("Goblin", 30, 10, 18)
    result = CombatEngine.execute_round(hero, monster)
    assert result.first_attacker_name == "Goblin"
    assert result.monster_attack is not None
    assert result.hero_attack is not None
