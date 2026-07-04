/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Sparkles, Award, Trash2 } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  currentScore?: number;
  currentLines?: number;
  gameMode?: 'Solo' | 'Versus';
  onBackToMenu: () => void;
  onSubmitScore?: (entry: Omit<LeaderboardEntry, 'id' | 'date'>) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  currentScore = 0,
  currentLines = 0,
  gameMode = 'Solo',
  onBackToMenu,
  onSubmitScore
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filterMode, setFilterMode] = useState<'All' | 'Solo' | 'Versus'>('All');
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');

  // Load scores on component mount
  useEffect(() => {
    const rawScores = localStorage.getItem('unotetris_high_scores');
    if (rawScores) {
      try {
        const parsed = JSON.parse(rawScores) as LeaderboardEntry[];
        // Sort descending by score
        parsed.sort((a, b) => b.score - a.score);
        setEntries(parsed);
      } catch (e) {
        console.error('Error parsing high scores', e);
      }
    } else {
      // Seed initial mock leaderboards for design elegance
      const initialSeed: LeaderboardEntry[] = [
        { id: '1', name: 'UNO_CHAMP', score: 24500, lines: 42, mode: 'Solo', date: '2026-06-28' },
        { id: '2', name: 'BLOCK_SABOTEUR', score: 18200, lines: 31, mode: 'Versus', date: '2026-07-01' },
        { id: '3', name: 'TETRIS_FANATIC', score: 14000, lines: 25, mode: 'Solo', date: '2026-07-02' },
        { id: '4', name: 'WILD_CARD', score: 11200, lines: 19, mode: 'Versus', date: '2026-07-03' }
      ];
      localStorage.setItem('unotetris_high_scores', JSON.stringify(initialSeed));
      setEntries(initialSeed);
    }
  }, []);

  const handleClearScores = () => {
    if (window.confirm('Are you sure you want to wipe all high scores?')) {
      localStorage.removeItem('unotetris_high_scores');
      setEntries([]);
    }
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const formattedName = name.trim().slice(0, 15).toUpperCase();
    const newEntry: LeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: formattedName,
      score: currentScore,
      lines: currentLines,
      mode: gameMode as 'Solo' | 'Versus',
      date: new Date().toISOString().split('T')[0]
    };

    const updatedEntries = [...entries, newEntry].sort((a, b) => b.score - a.score);
    localStorage.setItem('unotetris_high_scores', JSON.stringify(updatedEntries));
    setEntries(updatedEntries);
    setSubmitted(true);

    if (onSubmitScore) {
      onSubmitScore({
        name: formattedName,
        score: currentScore,
        lines: currentLines,
        mode: gameMode as 'Solo' | 'Versus'
      });
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (filterMode === 'All') return true;
    return entry.mode === filterMode;
  });

  const isEligibleForNewScore = currentScore > 0 && !submitted;

  return (
    <div className="w-full max-w-2xl bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-amber-500/5 text-amber-400 rounded-full flex items-center justify-center mb-2 border border-amber-500/10">
          <Trophy size={26} />
        </div>
        <h2 className="text-2xl font-black text-white tracking-widest uppercase text-center font-sans flex items-center gap-2">
          <span>HALL OF FAME</span>
        </h2>
        <p className="text-xs text-slate-400 text-center font-mono mt-1">
          THE GREATEST UNO-BLOCK BATTLE CONQUERORS
        </p>
      </div>

      {/* Form for Submitting a New High Score (Conditional) */}
      {isEligibleForNewScore && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/30 animate-pulse">
          <h3 className="text-amber-400 font-bold text-sm uppercase flex items-center gap-1.5 mb-2 font-sans">
            <Sparkles size={16} /> NEW RECORD RECORDED!
          </h3>
          <p className="text-xs text-slate-300 mb-3 font-mono">
            You scored <strong className="text-white">{currentScore}</strong> points ({currentLines} lines) on <strong className="text-white">{gameMode}</strong> mode!
          </p>
          <form onSubmit={handleLocalSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="ENTER YOUR INITIALS"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-[#0A0A0B]/50 border border-white/10 text-white rounded-lg px-3 py-2 text-sm font-mono placeholder:text-zinc-650 focus:outline-none focus:border-amber-500/40 uppercase"
              required
              maxLength={12}
            />
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
            >
              SAVE SCORE
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex justify-between items-center gap-4 mb-4">
        <div className="flex bg-white/[0.01] rounded-lg p-1 border border-white/10">
          {(['All', 'Solo', 'Versus'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 text-xs font-bold rounded-md font-mono transition-all cursor-pointer ${
                filterMode === mode
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        {entries.length > 0 && (
          <button
            onClick={handleClearScores}
            className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
            title="Clear all scores"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto border border-white/10 rounded-xl bg-white/[0.01] max-h-[300px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-zinc-500 font-mono text-[10px] uppercase bg-white/[0.02]">
              <th className="py-2.5 px-4 text-center w-12">Rank</th>
              <th className="py-2.5 px-4">Name</th>
              <th className="py-2.5 px-4 text-right">Score</th>
              <th className="py-2.5 px-4 text-center">Lines</th>
              <th className="py-2.5 px-4 text-center">Mode</th>
              <th className="py-2.5 px-4 text-right pr-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-600 italic">
                  No records found. Play a game to make history!
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => {
                const globalIndex = entries.findIndex((e) => e.id === entry.id) + 1;
                let rankStyle = 'text-slate-400 bg-slate-900/40';
                let rowHighlight = '';

                if (globalIndex === 1) {
                  rankStyle = 'text-amber-400 bg-amber-500/10 border border-amber-500/20';
                  rowHighlight = 'bg-amber-500/5';
                } else if (globalIndex === 2) {
                  rankStyle = 'text-slate-300 bg-slate-300/10 border border-slate-300/20';
                } else if (globalIndex === 3) {
                  rankStyle = 'text-amber-600 bg-amber-700/10 border border-amber-700/20';
                }

                return (
                  <tr
                    key={entry.id}
                    className={`hover:bg-slate-900/30 transition-all ${rowHighlight}`}
                  >
                    <td className="py-2.5 px-4 text-center font-bold">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${rankStyle}`}>
                        {globalIndex}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-white tracking-wide uppercase">
                      {entry.name}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-amber-400">
                      {entry.score.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-300 font-bold">
                      {entry.lines}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        entry.mode === 'Solo'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {entry.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500 text-[10px] pr-4">
                      <span className="flex items-center justify-end gap-1">
                        <Calendar size={10} />
                        {entry.date}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onBackToMenu}
          className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all uppercase tracking-wider"
        >
          BACK TO MAIN MENU
        </button>
      </div>
    </div>
  );
};
