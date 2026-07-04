/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Bomb, Shuffle as ShuffleIcon, Palette, Gauge, Trash2 } from 'lucide-react';
import { UnoCard as UnoCardType } from '../types';
import { CARD_BG_COLORS } from '../constants';

interface UnoCardProps {
  card: UnoCardType;
  index: number;
  onUseSelf?: () => void;
  onUseOpponent?: () => void;
  isInteractive?: boolean;
  hotkeySelf?: string;
  hotkeyOpponent?: string;
  disabled?: boolean;
}

export const UnoCard: React.FC<UnoCardProps> = ({
  card,
  index,
  onUseSelf,
  onUseOpponent,
  isInteractive = true,
  hotkeySelf,
  hotkeyOpponent,
  disabled = false
}) => {
  const getIcon = () => {
    const iconSize = 24;
    switch (card.type) {
      case 'COLOUR_SWITCH':
        return <Palette size={iconSize} />;
      case 'BOMB':
        return <Bomb size={iconSize} />;
      case 'SLOW_DOWN':
        return <Gauge size={iconSize} />;
      case 'CLEAR_ROW':
        return <Trash2 size={iconSize} />;
      case 'SHUFFLE':
        return <ShuffleIcon size={iconSize} />;
      default:
        return null;
    }
  };

  const bgClass = CARD_BG_COLORS[card.color] || CARD_BG_COLORS.wild;

  return (
    <motion.div
      initial={{ scale: 0.8, y: 20, opacity: 0, rotate: index * 4 - 6 }}
      animate={{ scale: 1, y: 0, opacity: 1, rotate: index * 4 - 6 }}
      whileHover={isInteractive && !disabled ? { scale: 1.08, y: -8, rotate: 0, zIndex: 10 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative w-36 h-52 rounded-xl border-[4px] border-white p-1 flex flex-col justify-between overflow-hidden bg-gradient-to-br shadow-[0_20px_40px_rgba(0,0,0,0.65)] select-none ${bgClass} ${
        disabled ? 'opacity-40 grayscale pointer-events-none' : ''
      }`}
    >
      <div className="border border-white/25 rounded-lg p-1.5 flex flex-col justify-between h-full w-full relative z-10">
        {/* Cards style inner oval */}
        <div className="absolute inset-0 opacity-10 bg-white rounded-full scale-x-[1.4] scale-y-[1.8] rotate-[-25deg] pointer-events-none" />

        {/* Mini Top-Left Corner Symbol */}
        <div className="flex justify-between items-start font-bold">
          <div className="flex flex-col items-center">
            <span className="text-sm tracking-tighter leading-none">{card.title[0]}</span>
            <div className="scale-75 origin-top-left">{getIcon()}</div>
          </div>
          <div className="text-[9px] opacity-80 font-mono uppercase bg-black/25 px-1.5 py-0.5 rounded-full border border-white/10">
            UNO
          </div>
        </div>

        {/* Center Circle & Large Icon */}
        <div className="relative flex-1 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-slate-950 shadow-md transform -skew-x-6 border border-slate-200">
            <motion.div
              animate={card.type === 'BOMB' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-indigo-950 font-bold"
            >
              {getIcon()}
            </motion.div>
          </div>
          <span className="text-[11px] font-black font-sans mt-2.5 text-center drop-shadow px-1 max-h-8 overflow-hidden leading-tight text-white uppercase tracking-tight">
            {card.title}
          </span>
        </div>

        {/* Card Details & Actions */}
        <div className="flex flex-col gap-1 items-center">
          {isInteractive && (onUseSelf || onUseOpponent) ? (
            <div className="flex flex-col w-full gap-1 z-10 text-[9px]">
              {onUseSelf && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseSelf();
                  }}
                  className="w-full bg-black/50 hover:bg-black/75 text-white font-bold py-1 px-1.5 rounded border border-white/10 flex justify-between items-center transition-all cursor-pointer text-left"
                >
                  <span>For Me</span>
                  {hotkeySelf && (
                    <kbd className="bg-white/20 text-white text-[8px] px-1 rounded font-mono font-bold">
                      {hotkeySelf}
                    </kbd>
                  )}
                </button>
              )}
              {onUseOpponent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseOpponent();
                  }}
                  className="w-full bg-white/20 hover:bg-white/40 text-white font-bold py-1 px-1.5 rounded border border-white/25 flex justify-between items-center transition-all cursor-pointer text-left"
                >
                  <span>Sabotage</span>
                  {hotkeyOpponent && (
                    <kbd className="bg-black/40 text-white text-[8px] px-1 rounded font-mono font-bold">
                      {hotkeyOpponent}
                    </kbd>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-[9px] text-center opacity-90 leading-tight select-none font-medium text-white">
              {card.description}
            </p>
          )}
        </div>

        {/* Mini Bottom-Right Corner Symbol */}
        <div className="flex justify-end items-end font-bold rotate-180 scale-x-[-1]">
          <div className="flex flex-col items-center">
            <div className="scale-75 origin-top-left">{getIcon()}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
