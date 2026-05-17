'use client';

import axios from 'axios';
import { useState } from 'react';
import CharacterFormFields, { CharacterFormValues } from './CharacterFormFields';
import {
  inventoryFromLoadout,
  loadoutFromInventory,
} from './characterOptions';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface RosterCharacter {
  id: number;
  name: string;
  current_hp: number;
  max_hp: number;
  strength: number;
  dexterity: number;
  inventory: string[];
  is_alive: boolean;
}

function formatAxiosDetail(error: unknown): string | null {
  if (!axios.isAxiosError(error) || !error.response?.data) return null;
  const d = error.response.data as { detail?: unknown };
  if (d.detail == null) return null;
  if (typeof d.detail === 'string') return d.detail;
  return JSON.stringify(d.detail);
}

function valuesFromCharacter(c: RosterCharacter): CharacterFormValues {
  const { weapon, armor } = loadoutFromInventory(c.inventory);
  return {
    name: c.name,
    maxHp: c.max_hp,
    strength: c.strength,
    dexterity: c.dexterity,
    weapon,
    armor,
    healToFull: true,
  };
}

interface CharacterRosterProps {
  characters: RosterCharacter[];
  disabled?: boolean;
  lockEdits?: boolean;
  onChanged: () => void;
  onDeleted: (deletedId: number) => void;
}

export default function CharacterRoster({
  characters,
  disabled = false,
  lockEdits = false,
  onChanged,
  onDeleted,
}: CharacterRosterProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<CharacterFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const startEdit = (c: RosterCharacter) => {
    setEditingId(c.id);
    setEditValues(valuesFromCharacter(c));
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues(null);
    setError('');
  };

  const saveEdit = async () => {
    if (editingId == null || editValues == null) return;
    if (!editValues.name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await axios.put(`${API_BASE}/characters/${editingId}`, {
        name: editValues.name.trim(),
        max_hp: editValues.maxHp,
        strength: editValues.strength,
        dexterity: editValues.dexterity,
        inventory: inventoryFromLoadout(editValues.weapon, editValues.armor),
        heal_to_full: editValues.healToFull,
      });
      cancelEdit();
      onChanged();
    } catch (err) {
      setError(formatAxiosDetail(err) ?? 'Could not update character.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCharacter = async (id: number, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;

    setDeletingId(id);
    setError('');

    try {
      await axios.delete(`${API_BASE}/characters/${id}`);
      if (editingId === id) cancelEdit();
      onDeleted(id);
      onChanged();
    } catch (err) {
      setError(formatAxiosDetail(err) ?? 'Could not delete character.');
    } finally {
      setDeletingId(null);
    }
  };

  if (characters.length === 0) return null;

  const editsLocked = disabled || lockEdits;

  return (
    <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">
        Roster
      </h2>
      {lockEdits && (
        <p className="text-xs text-neutral-500">
          Finish or reset the current fight to edit or delete fighters.
        </p>
      )}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <ul className="space-y-3">
        {characters.map((c) => (
          <li
            key={c.id}
            className="border border-neutral-800 rounded-lg p-4 space-y-3"
          >
            {editingId === c.id && editValues ? (
              <>
                <CharacterFormFields
                  values={editValues}
                  disabled={saving}
                  showHealOption
                  onChange={setEditValues}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">{c.name}</p>
                  <p className="text-sm text-neutral-400 font-mono">
                    HP {c.current_hp}/{c.max_hp} · STR {c.strength} · DEX{' '}
                    {c.dexterity}
                  </p>
                  {c.inventory.length > 0 && (
                    <p className="text-xs text-neutral-500 mt-1">
                      {c.inventory.join(', ')}
                    </p>
                  )}
                  {!c.is_alive && (
                    <p className="text-xs text-amber-500 mt-1">Defeated</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    disabled={editsLocked || deletingId != null}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCharacter(c.id, c.name)}
                    disabled={editsLocked || deletingId === c.id}
                    className="px-3 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 rounded-lg text-sm disabled:opacity-50"
                  >
                    {deletingId === c.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
