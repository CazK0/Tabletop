'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [story, setStory] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const swingSword = async () => {
    setLoading(true);
    setStory(''); // Clear the old story

    try {
      // 1. Send the data to your Python backend
      const response = await axios.post('http://127.0.0.1:8000/combat/narrate', {
        context: "Hero rolled an 18 (+3). Hit! Dealt 12 damage to the Undead Knight."
      });

      // 2. Save the AI's story to our state
      setStory(response.data);
    } catch (error) {
      console.error("The bridge is down:", error);
      setStory("Error: Could not reach the Dungeon Master.");
    }

    setLoading(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <div className="max-w-2xl w-full flex flex-col items-center space-y-8">

        <h1 className="text-4xl font-bold text-red-500 tracking-widest uppercase">
          Arena Testing
        </h1>

        <button
          onClick={swingSword}
          disabled={loading}
          className="px-8 py-4 bg-red-700 hover:bg-red-600 active:bg-red-800 rounded-lg font-bold text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        >
          {loading ? "Waiting for DM..." : "Swing Sword!"}
        </button>

        {/* The Narration Box */}
        <div className="w-full min-h-[150px] bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-xl">
          {loading && (
            <p className="text-neutral-500 italic animate-pulse text-center mt-6">
              The AI is visualizing the strike...
            </p>
          )}

          {story && !loading && (
            <p className="text-lg text-neutral-300 leading-relaxed">
              {/* If your backend returns {"narration": "..."} we might need to parse it,
                  but for now we will just stringify whatever comes back to be safe */}
              {typeof story === 'string' ? story : JSON.stringify(story, null, 2)}
            </p>
          )}
        </div>

      </div>
    </main>
  );
}