'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const HERO_ID = 1;
const MONSTER_ID = 2;

interface Character {
  id: number;
  name: string;
  current_hp: number;
  max_hp: number;
  strength: number;
  dexterity: number;
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
}

interface RoundResult {
  hero_attack: AttackResult;
  monster_attack: AttackResult | null;
  fight_over: boolean;
  winner_name: string | null;
  ai_context_string: string;
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
  return `${attack.attacker_name} → ${attack.defender_name}: d20 ${attack.roll} (+${attack.modifier}) = ${attack.total_attack} · ${hitLabel}${critLabel} · ${attack.damage_dealt} dmg · ${attack.defender_name} at ${attack.defender_remaining_hp} HP`;
}

export default function Home() {
  const [story, setStory] = useState<string>('');
  const [mechanics, setMechanics] = useState<string[]>([]);
  const [fightOver, setFightOver] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);

  const fetchCharacters = async () => {
    try {
      const { data } = await axios.get<Character[]>(`${API_BASE}/characters/`);
      setCharacters(data);
      const hero = data.find((c) => c.id === HERO_ID);
      const monster = data.find((c) => c.id === MONSTER_ID);
      const over =
        (hero != null && !hero.is_alive) || (monster != null && !monster.is_alive);
      setFightOver(over);
    } catch {
      setCharacters([]);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const swingSword = async () => {
    setLoading(true);
    setStory('');
    setMechanics([]);
    setWinnerName(null);

    try {
      const { data: round } = await axios.post<RoundResult>(
        `${API_BASE}/combat/round`,
        { hero_id: HERO_ID, monster_id: MONSTER_ID },
      );

      const lines = [formatAttackLine(round.hero_attack)];
      if (round.monster_attack) {
        lines.push(formatAttackLine(round.monster_attack));
      }
      setMechanics(lines);
      setFightOver(round.fight_over);
      setWinnerName(round.winner_name);

      await fetchCharacters();

      const { data: narr } = await axios.post<{ narration: string }>(
        `${API_BASE}/combat/narrate`,
        { context: round.ai_context_string },
      );

      setStory(
        typeof narr.narration === 'string' && narr.narration.length > 0
          ? narr.narration
          : round.ai_context_string,
      );
    } catch (error) {
      const detail = formatAxiosDetail(error);
      setStory(
        detail ??
          "Error: The combat engine stalled or the DM couldn't be reached.",
      );
    } finally {
      setLoading(false);
    }
  };

  const newFight = async () => {
    setResetting(true);
    setStory('');
    setMechanics([]);
    setWinnerName(null);

    try {
      await axios.post(`${API_BASE}/combat/reset`, {
        character_ids: [HERO_ID, MONSTER_ID],
      });
      setFightOver(false);
      await fetchCharacters();
    } catch (error) {
      const detail = formatAxiosDetail(error);
      setStory(detail ?? 'Error: Could not reset the arena.');
    } finally {
      setResetting(false);
    }
  };

  const hero = characters.find((c) => c.id === HERO_ID);
  const monster = characters.find((c) => c.id === MONSTER_ID);
  const busy = loading || resetting;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <div className="max-w-4xl w-full flex flex-col items-center space-y-12">
        <h1 className="text-4xl font-bold text-red-500 tracking-widest uppercase">
          Arena
        </h1>

        {fightOver && (
          <p className="text-amber-400 font-semibold text-center">
            {winnerName
              ? `${winnerName} wins the fight!`
              : 'The fight is over.'}
          </p>
        )}

        {characters.length > 0 && (
          <div className="flex justify-between w-full space-x-8">
            {hero && (
              <div className="flex-1 bg-neutral-900 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-2xl font-bold mb-2">{hero.name}</h2>
                <div className="w-full bg-neutral-950 rounded-full h-6 border border-neutral-800 relative overflow-hidden">
                  <div
                    className="bg-green-600 h-6 transition-all duration-500"
                    style={{
                      width: `${(hero.current_hp / hero.max_hp) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="mt-2 text-neutral-400 font-mono">
                  HP: {hero.current_hp} / {hero.max_hp}
                </p>
              </div>
            )}

            {monster && (
              <div className="flex-1 bg-neutral-900 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-2xl font-bold mb-2 text-right">
                  {monster.name}
                </h2>
                <div className="w-full bg-neutral-950 rounded-full h-6 border border-neutral-800 relative overflow-hidden">
                  <div
                    className="bg-red-600 h-6 transition-all duration-500"
                    style={{
                      width: `${(monster.current_hp / monster.max_hp) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="mt-2 text-neutral-400 font-mono text-right">
                  HP: {monster.current_hp} / {monster.max_hp}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={swingSword}
            disabled={busy || fightOver}
            className="px-8 py-4 bg-red-700 hover:bg-red-600 active:bg-red-800 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.5)]"
          >
            {loading ? 'Resolving round...' : 'Swing Sword!'}
          </button>

          <button
            onClick={newFight}
            disabled={busy}
            className="px-8 py-4 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting...' : 'New Fight'}
          </button>
        </div>

        {mechanics.length > 0 && !loading && (
          <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
            {mechanics.map((line, i) => (
              <p key={i} className="text-sm font-mono text-neutral-300">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="w-full min-h-[150px] bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-xl">
          {loading && (
            <p className="text-neutral-500 italic animate-pulse text-center mt-6">
              The AI is visualizing the strike...
            </p>
          )}

          {story && !loading && (
            <p className="text-lg text-neutral-300 leading-relaxed">{story}</p>
          )}
        </div>
      </div>
    </main>
  );
}
