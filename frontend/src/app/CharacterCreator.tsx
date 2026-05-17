'use client';

import axios from 'axios';
import { FormEvent, useState } from 'react';
import CharacterFormFields, { CharacterFormValues } from './CharacterFormFields';
import { ARMORS, WEAPONS, inventoryFromLoadout } from './characterOptions';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const defaultValues: CharacterFormValues = {
  name: '',
  maxHp: 30,
  strength: 12,
  dexterity: 12,
  weapon: WEAPONS[0],
  armor: ARMORS[0],
  healToFull: true,
};

interface CharacterCreatorProps {
  onCreated: () => void;
  disabled?: boolean;
}

export default function CharacterCreator({
  onCreated,
  disabled = false,
}: CharacterCreatorProps) {
  const [values, setValues] = useState<CharacterFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await axios.post(`${API_BASE}/characters/`, {
        name: values.name.trim(),
        level: 1,
        current_hp: values.maxHp,
        max_hp: values.maxHp,
        strength: values.strength,
        dexterity: values.dexterity,
        inventory: inventoryFromLoadout(values.weapon, values.armor),
        is_alive: true,
      });
      setValues(defaultValues);
      onCreated();
    } catch {
      setError('Could not create character.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4"
    >
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">
        Create Character
      </h2>
      <CharacterFormFields
        values={values}
        disabled={disabled || submitting}
        onChange={setValues}
      />
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
