export const WEAPONS = [
  'Longsword',
  'Greataxe',
  'Shortsword',
  'Dagger',
  'Club',
  'Mace',
  'Spear',
] as const;

export const ARMORS = [
  'None',
  'Padded Armor',
  'Leather Armor',
  'Hide Armor',
  'Chain Mail',
  'Scale Mail',
  'Plate Armor',
  'Shield',
] as const;

const WEAPON_SET = new Set(WEAPONS.map((w) => w.toLowerCase()));
const ARMOR_SET = new Set(
  ARMORS.filter((a) => a !== 'None').map((a) => a.toLowerCase()),
);

export function inventoryFromLoadout(weapon: string, armor: string): string[] {
  const items = [weapon];
  if (armor !== 'None') {
    items.push(armor);
  }
  return items;
}

export function loadoutFromInventory(inventory: string[]): {
  weapon: string;
  armor: string;
} {
  let weapon: string = WEAPONS[0];
  let armor = 'None';
  for (const item of inventory) {
    const key = item.trim().toLowerCase();
    if (WEAPON_SET.has(key)) {
      weapon =
        WEAPONS.find((w) => w.toLowerCase() === key) ?? weapon;
    }
    if (ARMOR_SET.has(key)) {
      armor =
        ARMORS.find((a) => a !== 'None' && a.toLowerCase() === key) ?? armor;
    }
  }
  return { weapon, armor };
}
