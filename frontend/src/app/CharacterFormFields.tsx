'use client';

import { ARMORS, WEAPONS } from './characterOptions';

const inputClass =
  'bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white w-full disabled:opacity-50';

export interface CharacterFormValues {
  name: string;
  maxHp: number;
  strength: number;
  dexterity: number;
  weapon: string;
  armor: string;
  healToFull: boolean;
}

interface CharacterFormFieldsProps {
  values: CharacterFormValues;
  disabled?: boolean;
  showHealOption?: boolean;
  onChange: (values: CharacterFormValues) => void;
}

export default function CharacterFormFields({
  values,
  disabled = false,
  showHealOption = false,
  onChange,
}: CharacterFormFieldsProps) {
  const patch = (partial: Partial<CharacterFormValues>) =>
    onChange({ ...values, ...partial });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-xs text-neutral-500">Name</span>
        <input
          type="text"
          value={values.name}
          disabled={disabled}
          onChange={(e) => patch({ name: e.target.value })}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Max HP</span>
        <input
          type="number"
          min={1}
          max={999}
          value={values.maxHp}
          disabled={disabled}
          onChange={(e) => patch({ maxHp: Number(e.target.value) })}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Weapon</span>
        <select
          value={values.weapon}
          disabled={disabled}
          onChange={(e) => patch({ weapon: e.target.value })}
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
          value={values.armor}
          disabled={disabled}
          onChange={(e) => patch({ armor: e.target.value })}
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
          value={values.strength}
          disabled={disabled}
          onChange={(e) => patch({ strength: Number(e.target.value) })}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-neutral-500">Dexterity</span>
        <input
          type="number"
          min={1}
          max={30}
          value={values.dexterity}
          disabled={disabled}
          onChange={(e) => patch({ dexterity: Number(e.target.value) })}
          className={inputClass}
        />
      </label>
      {showHealOption && (
        <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
          <input
            type="checkbox"
            checked={values.healToFull}
            disabled={disabled}
            onChange={(e) => patch({ healToFull: e.target.checked })}
            className="rounded border-neutral-600"
          />
          <span className="text-sm text-neutral-400">Restore full HP on save</span>
        </label>
      )}
    </div>
  );
}
