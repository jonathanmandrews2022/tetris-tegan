/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, Keyboard, Play, Zap, ShieldAlert, Award } from 'lucide-react';
import { CONTROLS_INFO } from '../constants';

interface InstructionsProps {
  onBackToMenu: () => void;
}

export const Instructions: React.FC<InstructionsProps> = ({ onBackToMenu }) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'controls' | 'cards'>('rules');

  return (
    <div className="w-full max-w-2xl bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 bg-indigo-500/5 text-indigo-400 rounded-full flex items-center justify-center mb-2 border border-indigo-500/10">
          <HelpCircle size={26} />
        </div>
        <h2 className="text-2xl font-black text-white tracking-widest uppercase text-center font-sans">
          HOW TO PLAY
        </h2>
        <p className="text-xs text-slate-400 text-center font-mono mt-1">
          MASTER THE UNO CARDS & DOMINATE THE BLOCKS
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 pb-2 text-xs font-bold font-mono border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'rules'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Zap size={14} /> GAME RULES
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 pb-2 text-xs font-bold font-mono border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'cards'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShieldAlert size={14} /> UNO CARDS
        </button>
        <button
          onClick={() => setActiveTab('controls')}
          className={`flex-1 pb-2 text-xs font-bold font-mono border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'controls'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Keyboard size={14} /> CONTROLS
        </button>
      </div>

      {/* Tab Contents */}
      <div className="min-h-[240px] text-sm text-slate-300">
        {activeTab === 'rules' && (
          <div className="space-y-4 font-sans leading-relaxed">
            <div className="bg-white/[0.01] rounded-xl p-4 border border-white/10">
              <h3 className="font-bold text-white uppercase text-xs tracking-wider mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> THE MAIN CONCEPT
              </h3>
              <p className="text-xs text-slate-300">
                Play standard Tetris style (falling block lines) but with an explosive twist. Clearing rows draws powerful, randomized **UNO Action Cards** into your hand. You can hold up to **3 cards** at any time.
              </p>
            </div>

            <div className="bg-white/[0.01] rounded-xl p-4 border border-white/10">
              <h3 className="font-bold text-white uppercase text-xs tracking-wider mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> LOCAL VERSUS MODE (1v1)
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4 font-sans">
                <li>
                  <strong>Split-screen Action</strong>: Play against a friend on the same keyboard side-by-side.
                </li>
                <li>
                  <strong>Direct Sabotage</strong>: Use Uno Cards on yourself to survive, or play them on your opponent to completely wreck their stack and block placement!
                </li>
                <li>
                  <strong>Garbage Lines</strong>: Clearing multiple rows at once sends solid garbage rows (with a single gap) to the bottom of your opponent's board:
                  <ul className="list-circle pl-4 mt-1 space-y-0.5 text-slate-400 font-mono">
                    <li>Double (2 lines) → Sends 1 garbage line</li>
                    <li>Triple (3 lines) → Sends 2 garbage lines</li>
                    <li>Tetris (4 lines!) → Sends 4 garbage lines</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white/[0.01] border border-red-500/10 rounded-xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20 font-bold font-mono">
                B
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase font-sans">Bomb Card</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Triggers a massive 3x3 explosion centered on the densest grid cells. Target yourself to wipe out structural blocks, or target your opponent to rip apart their setup.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.01] border border-yellow-500/10 rounded-xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 font-bold font-mono">
                S
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase font-sans">Shuffle Card</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Shuffles solid blocks horizontally on the target board. Perfect for filling impossible gaps on your board, or introducing chaos to the opponent's strategy!
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.01] border border-blue-500/10 rounded-xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 font-bold font-mono">
                D
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase font-sans">Slow Down Card</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Reduces the active falling piece speed to 25% of current speed for 12 seconds. Use it on yourself to catch your breath when blocks pile high!
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/[0.01] border border-green-500/10 rounded-xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20 font-bold font-mono">
                C
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase font-sans">Clear Row Card</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Instantly vaporizes the bottom row of solid blocks on the board. Excellent utility to avoid game-over triggers.
                </p>
              </div>
            </div>

            <div className="p-3 col-span-1 sm:col-span-2 bg-white/[0.01] border border-purple-500/10 rounded-xl flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 font-bold font-mono">
                W
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase font-sans">Colour Switch Card</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Scrambles the color of every placed block randomly across the board. In versus, use it to confuse your opponent or reset your own blocks' color spectrum.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player 1 Mappings */}
              <div className="bg-white/[0.01] rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-3 font-sans text-indigo-400">
                  PLAYER 1 (Left Side)
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Move Left / Right:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p1.move}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Rotate Block:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p1.rotate}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Soft Drop:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p1.softDrop}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Hard Drop:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p1.hardDrop}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Hold Tetromino:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p1.hold}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-emerald-400 font-semibold">Play Card (Self):</span>
                    <span className="text-emerald-400 font-black">{CONTROLS_INFO.p1.useSelf}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-rose-400 font-semibold">Play Card (Opponent):</span>
                    <span className="text-rose-400 font-black">{CONTROLS_INFO.p1.useOpponent}</span>
                  </div>
                </div>
              </div>

              {/* Player 2 Mappings */}
              <div className="bg-white/[0.01] rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-3 font-sans text-emerald-400">
                  PLAYER 2 (Right Side)
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Move Left / Right:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p2.move}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Rotate Block:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p2.rotate}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Soft Drop:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p2.softDrop}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Hard Drop:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p2.hardDrop}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-500">Hold Tetromino:</span>
                    <span className="text-white font-bold">{CONTROLS_INFO.p2.hold}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-emerald-400 font-semibold">Play Card (Self):</span>
                    <span className="text-emerald-400 font-black">{CONTROLS_INFO.p2.useSelf}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-rose-400 font-semibold">Play Card (Opponent):</span>
                    <span className="text-rose-400 font-black">{CONTROLS_INFO.p2.useOpponent}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-2.5 bg-white/[0.01] border border-white/10 text-[10px] text-center rounded-lg text-zinc-400 font-sans">
              * Note: In Single Player, your board accepts controls from BOTH players! Either Q/E or K/L can be used to activate your drawn Uno cards!
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={onBackToMenu}
          className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all uppercase tracking-wider flex items-center gap-1"
        >
          <Play size={12} /> BACK TO MENU
        </button>
      </div>
    </div>
  );
};
