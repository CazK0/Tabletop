'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface Character {
  id: number;
  name: string;
  current_hp: number;
  max_hp: number;
  strength: number;
  dexterity: number;
  is_alive: boolean;
}

export default function Home() {
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [characters, setCharacters] = useState<Character[]>([]);

  const fetchCharacters = async () => {
    try {
      const response = await axios.get('http://localhost:8000/characters/');
      setCharacters(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const swingSword = async () => {
    setLoading(true);
    setStory('');

    try {
      const response = await axios.post('http://localhost:8000/combat/narrate', {
        context: "Hero rolled an 18 (+3). Hit! Dealt 12 damage to the Undead Knight."
      });

      setStory(response.data.narration || response.data);
    } catch (error) {
      setStory("Error: Could not reach the Dungeon Master.");
    }

    setLoading(false);
  };

  const hero = characters.find(c => c.id === 1);
  const monster = characters.find(c => c.id === 2);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <div className="max-w-4xl w-full flex flex-col items-center space-y-12">

        <h1 className="text-4xl font-bold text-red-500 tracking-widest uppercase">
          Arena
        </h1>

        {characters.length > 0 && (
          <div className="flex justify-between w-full space-x-8">
            {hero && (
              <div className="flex-1 bg-neutral-900 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-2xl font-bold mb-2">{hero.name}</h2>
                <div className="w-full bg-neutral-950 rounded-full h-6 border border-neutral-800 relative overflow-hidden">
                  <div
                    className="bg-green-600 h-6 transition-all duration-500"
                    style={{ width: `${(hero.current_hp / hero.max_hp) * 100}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-neutral-400 font-mono">HP: {hero.current_hp} / {hero.max_hp}</p>
              </div>
            )}

            {monster && (
              <div className="flex-1 bg-neutral-900 p-6 rounded-xl border border-neutral-700">
                <h2 className="text-2xl font-bold mb-2 text-right">{monster.name}</h2>
                <div className="w-full bg-neutral-950 rounded-full h-6 border border-neutral-800 relative overflow-hidden">
                  <div
                    className="bg-red-600 h-6 transition-all duration-500 float-right"
                    style={{ width: `${(monster.current_hp / monster.max_hp) * 100}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-neutral-400 font-mono text-right">HP: {monster.current_hp} / {monster.max_hp}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={swingSword}
          disabled={loading}
          className="px-8 py-4 bg-red-700 hover:bg-red-600 active:bg-red-800 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        >
          {loading ? "Waiting for DM..." : "Swing Sword!"}
        </button>

        <div className="w-full min-h-[150px] bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-xl">
          {loading && (
            <p className="text-neutral-500 italic animate-pulse text-center mt-6">
              The AI is visualizing the strike...
            </p>
          )}

          {story && !loading && (
            <p className="text-lg text-neutral-300 leading-relaxed">
              {typeof story === 'string' ? story : JSON.stringify(story, null, 2)}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}