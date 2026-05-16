'use client';

import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface Character {
  id: number;
  name: string;
  current_hp: number;
  max_hp: number;
  strength: number;
  dexterity: number;
  inventory: string[];
  is_alive: boolean;
}

interface AttackResult {
  attacker_name: string;
  defender_name: string;
  roll: number;
  modifier: number;
  total_attack: number;
  is_hit: boolean;
  is_critical: boolean;
  damage_dealt: number;
  defender_remaining_hp: number;
  is_fatal: boolean;
  weapon_name: string;
  weapon_die: number;
}

interface RoundResult {
  hero_attack: AttackResult;
  monster_attack: AttackResult | null;
  fight_over: boolean;
  winner_name: string | null;
  ai_context_string: string;
}

interface CombatLogEntry {
  round: number;
  mechanics: string[];
  narration: string;
}

function formatAxiosDetail(error: unknown): string | null {
  if (!axios.isAxiosError(error) || !error.response?.data) return null;
  const d = error.response.data as { detail?: unknown };
  if (d.detail == null) return null;
  if (typeof d.detail === 'string') return d.detail;
  return JSON.stringify(d.detail);
}

function formatAttackLine(attack: AttackResult): string {
  const hitLabel = attack.is_hit ? 'Hit' : 'Miss';
  const critLabel = attack.is_critical ? ' · CRIT' : '';
  return `${attack.attacker_name} [${attack.weapon_name} d${attack.weapon_die}] → ${attack.defender_name}: d20 ${attack.roll} (+${attack.modifier}) = ${attack.total_attack} · ${hitLabel}${critLabel} · ${attack.damage_dealt} dmg · ${attack.defender_name} at ${attack.defender_remaining_hp} HP`;
}

function roundMechanics(round: RoundResult): string[] {
  const lines = [formatAttackLine(round.hero_attack)];
  if (round.monster_attack) {
    lines.push(formatAttackLine(round.monster_attack));
  }
  return lines;
}

function pickDefaultFighters(chars: Character[]): { a: number | null; b: number | null } {
  if (chars.length === 0) return { a: null, b: null };
  if (chars.length === 1) return { a: chars[0].id, b: null };
  const sorted = [...chars].sort((x, y) => x.id - y.id);
  return { a: sorted[0].id, b: sorted[1].id };
}

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [fighterAId, setFighterAId] = useState<number | null>(null);
  const [fighterBId, setFighterBId] = useState<number | null>(null);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [latestNarration, setLatestNarration] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fightOver, setFightOver] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [fightStarted, setFightStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const syncFightOver = useCallback(
    (chars: Character[], aId: number | null, bId: number | null) => {
      const a = chars.find((c) => c.id === aId);
      const b = chars.find((c) => c.id === bId);
      const over =
        (a != null && !a.is_alive) || (b != null && !b.is_alive);
      setFightOver(over);
    },
    [],
  );

  const fetchCharacters = useCallback(async () => {
    try {
      const { data } = await axios.get<Character[]>(`${API_BASE}/characters/`);
      setCharacters(data);
      return data;
    } catch {
      setCharacters([]);
      return [];
    }
  }, []);

  useEffect(() => {
    void fetchCharacters().then((data) => {
      if (data.length === 0) return;
      setFighterAId((prev) => {
        if (prev != null && data.some((c) => c.id === prev)) return prev;
        return pickDefaultFighters(data).a;
      });
      setFighterBId((prev) => {
        if (prev != null && data.some((c) => c.id === prev)) return prev;
        return pickDefaultFighters(data).b;
      });
    });
  }, [fetchCharacters]);

  useEffect(() => {
    syncFightOver(characters, fighterAId, fighterBId);
  }, [characters, fighterAId, fighterBId, syncFightOver]);

  const fighterA = useMemo(
    () => characters.find((c) => c.id === fighterAId),
    [characters, fighterAId],
  );
  const fighterB = useMemo(
    () => characters.find((c) => c.id === fighterBId),
    [characters, fighterBId],
  );

  const sameFighter =
    fighterAId != null && fighterBId != null && fighterAId === fighterBId;
  const fightersReady =
    fighterAId != null && fighterBId != null && !sameFighter;
  const busy = loading || resetting;
  const canPickFighters = !fightStarted || fightOver;

  const swingSword = async () => {
    if (!fightersReady || fighterAId == null || fighterBId == null) return;

    setLoading(true);
    setErrorMessage('');

    try {
      const { data: round } = await axios.post<RoundResult>(
        `${API_BASE}/combat/round`,
        { hero_id: fighterAId, monster_id: fighterBId },
      );

      const mechanics = roundMechanics(round);
      setFightStarted(true);
      setFightOver(round.fight_over);
      setWinnerName(round.winner_name);

      const { data: narr } = await axios.post<{ narration: string }>(
        `${API_BASE}/combat/narrate`,
        { context: round.ai_context_string },
      );

      const narration =
        typeof narr.narration === 'string' && narr.narration.length > 0
          ? narr.narration
          : round.ai_context_string;

      setLatestNarration(narration);
      setCombatLog((prev) => [
        ...prev,
        { round: prev.length + 1, mechanics, narration },
      ]);

      const data = await fetchCharacters();
      syncFightOver(data, fighterAId, fighterBId);
    } catch (error) {
      const detail = formatAxiosDetail(error);
      setErrorMessage(
        detail ??
          "Error: The combat engine stalled or the DM couldn't be reached.",
      );
    } finally {
      setLoading(false);
    }
  };

  const newFight = async () => {
    if (!fightersReady || fighterAId == null || fighterBId == null) return;

    setResetting(true);
    setErrorMessage('');
    setLatestNarration('');
    setCombatLog([]);
    setWinnerName(null);

    try {
      await axios.post(`${API_BASE}/combat/reset`, {
        character_ids: [fighterAId, fighterBId],
      });
      setFightOver(false);
      setFightStarted(false);
      await fetchCharacters();
    } catch (error) {
      const detail = formatAxiosDetail(error);
      setErrorMessage(detail ?? 'Error: Could not reset the arena.');
    } finally {
      setResetting(false);
    }
  };

  const renderFighterCard = (
    fighter: Character | undefined,
    align: 'left' | 'right',
  ) => {
    if (!fighter) return null;
    const barColor = align === 'left' ? 'bg-green-600' : 'bg-red-600';
    return (
      <div
        className={`flex-1 bg-neutral-900 p-6 rounded-xl border border-neutral-700 ${align === 'right' ? 'text-right' : ''}`}
      >
        <h2 className="text-2xl font-bold mb-2">{fighter.name}</h2>
        <div className="w-full bg-neutral-950 rounded-full h-6 border border-neutral-800 relative overflow-hidden">
          <div
            className={`${barColor} h-6 transition-all duration-500`}
            style={{
              width: `${(fighter.current_hp / fighter.max_hp) * 100}%`,
            }}
          />
        </div>
        <p className="mt-2 text-neutral-400 font-mono">
          HP: {fighter.current_hp} / {fighter.max_hp}
        </p>
        {fighter.inventory.length > 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            {fighter.inventory.join(', ')}
          </p>
        )}
      </div>
    );
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <div className="max-w-4xl w-full flex flex-col items-center space-y-8">
        <h1 className="text-4xl font-bold text-red-500 tracking-widest uppercase">
          Arena
        </h1>

        {characters.length >= 2 && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-neutral-400 uppercase tracking-wide">
                Fighter A
              </span>
              <select
                value={fighterAId ?? ''}
                disabled={!canPickFighters || busy}
                onChange={(e) => setFighterAId(Number(e.target.value))}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white disabled:opacity-50"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-neutral-400 uppercase tracking-wide">
                Fighter B
              </span>
              <select
                value={fighterBId ?? ''}
                disabled={!canPickFighters || busy}
                onChange={(e) => setFighterBId(Number(e.target.value))}
                className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-white disabled:opacity-50"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {sameFighter && (
          <p className="text-rose-400 text-sm text-center">
            Select two different fighters.
          </p>
        )}

        {fightOver && (
          <p className="text-amber-400 font-semibold text-center">
            {winnerName
              ? `${winnerName} wins the fight!`
              : 'The fight is over.'}
          </p>
        )}

        {fightersReady && fighterA && fighterB && (
          <div className="flex justify-between w-full gap-8">
            {renderFighterCard(fighterA, 'left')}
            {renderFighterCard(fighterB, 'right')}
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={swingSword}
            disabled={busy || fightOver || !fightersReady}
            className="px-8 py-4 bg-red-700 hover:bg-red-600 active:bg-red-800 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.5)]"
          >
            {loading ? 'Resolving round...' : 'Swing Sword!'}
          </button>

          <button
            onClick={newFight}
            disabled={busy || !fightersReady}
            className="px-8 py-4 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting...' : 'New Fight'}
          </button>
        </div>

        {combatLog.length > 0 && (
          <div className="w-full max-h-72 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-6">
            <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">
              Combat Log
            </h2>
            {combatLog.map((entry) => (
              <div
                key={entry.round}
                className="border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 space-y-2"
              >
                <p className="text-xs text-neutral-500 font-mono">
                  Round {entry.round}
                </p>
                {entry.mechanics.map((line, i) => (
                  <p key={i} className="text-sm font-mono text-neutral-300">
                    {line}
                  </p>
                ))}
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {entry.narration}
                </p>
              </div>
            ))}
          </div>
        )}

        {(latestNarration || errorMessage) && (
          <div className="w-full min-h-[120px] bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-xl">
            {loading && (
              <p className="text-neutral-500 italic animate-pulse text-center">
                The AI is visualizing the strike...
              </p>
            )}
            {!loading && errorMessage && (
              <p className="text-lg text-rose-300 leading-relaxed">
                {errorMessage}
              </p>
            )}
            {!loading && !errorMessage && latestNarration && (
              <p className="text-lg text-neutral-300 leading-relaxed">
                {latestNarration}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
