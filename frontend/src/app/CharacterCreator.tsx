'use client';

import axios from 'axios';
import { FormEvent, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const WEAPONS = [
  'Longsword',
  'Greataxe',
  'Shortsword',
  'Dagger',
  'Club',
  'Mace',
  'Spear',
] as const;

const ARMORS = [
  'None',
  'Padded Armor',
  'Leather Armor',
  'Hide Armor',
  'Chain Mail',
  'Scale Mail',
  'Plate Armor',
  'Shield',
] as const;

interface CharacterCreatorProps {
  onCreated: () => void;
  disabled?: boolean;
}

export default function CharacterCreator({
  onCreated,
  disabled = false,
}: CharacterCreatorProps) {
  const [name, setName] = useState('');
  const [maxHp, setMaxHp] = useState(30);
  const [strength, setStrength] = useState(12);
  const [dexterity, setDexterity] = useState(12);
  const [weapon, setWeapon] = useState<string>(WEAPONS[0]);
  const [armor, setArmor] = useState<string>(ARMORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const inventory = [weapon];
      if (armor !== 'None') {
        inventory.push(armor);
      }
      await axios.post(`${API_BASE}/characters/`, {
        name: name.trim(),
        level: 1,
        current_hp: maxHp,
        max_hp: maxHp,
        strength,
        dexterity,
        inventory,
        is_alive: true,
      });
      setName('');
      setMaxHp(30);
      setStrength(12);
      setDexterity(12);
      setWeapon(WEAPONS[0]);
      setArmor(ARMORS[0]);
      onCreated();
    } catch {
      setError('Could not create character.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white w-full disabled:opacity-50';

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4"
    >
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">
        Create Character
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-neutral-500">Name</span>
          <input
            type="text"
            value={name}
            disabled={disabled || submitting}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Max HP</span>
          <input
            type="number"
            min={1}
            max={999}
            value={maxHp}
            disabled={disabled || submitting}
            onChange={(e) => setMaxHp(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Weapon</span>
          <select
            value={weapon}
            disabled={disabled || submitting}
            onChange={(e) => setWeapon(e.target.value)}
            className={inputClass}
          >
            {WEAPONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Armor</span>
          <select
            value={armor}
            disabled={disabled || submitting}
            onChange={(e) => setArmor(e.target.value)}
            className={inputClass}
          >
            {ARMORS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Strength</span>
          <input
            type="number"
            min={1}
            max={30}
            value={strength}
            disabled={disabled || submitting}
            onChange={(e) => setStrength(Number(e.target.value))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-neutral-500">Dexterity</span>
          <input
            type="number"
            min={1}
            max={30}
            value={dexterity}
            disabled={disabled || submitting}
            onChange={(e) => setDexterity(Number(e.target.value))}
            className={inputClass}
          />
        </label>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-semibold disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Add Character'}
      </button>
    </form>
  );
}
