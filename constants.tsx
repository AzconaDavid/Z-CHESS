
import React from 'react';

export const COOLDOWN_DURATION = 5000; // 5 seconds default

export const BOARD_THEMES = {
  classic: { light: 'bg-slate-200', dark: 'bg-slate-400', accent: 'bg-blue-500' },
  neon: { light: 'bg-cyan-900', dark: 'bg-slate-900', accent: 'bg-fuchsia-500' },
  wood: { light: 'bg-amber-100', dark: 'bg-amber-800', accent: 'bg-green-600' },
  midnight: { light: 'bg-indigo-900', dark: 'bg-black', accent: 'bg-purple-500' },
};

export const INITIAL_BOARD = (): (any | null)[][] => {
  const layout: any[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  const backRank: any[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  
  // Black pieces
  for (let i = 0; i < 8; i++) {
    layout[0][i] = { id: `b-br-${i}`, type: backRank[i], color: 'b', cooldownUntil: 0 };
    layout[1][i] = { id: `b-p-${i}`, type: 'p', color: 'b', cooldownUntil: 0 };
    
    // White pieces
    layout[6][i] = { id: `w-p-${i}`, type: 'p', color: 'w', cooldownUntil: 0 };
    layout[7][i] = { id: `w-br-${i}`, type: backRank[i], color: 'w', cooldownUntil: 0 };
  }
  
  return layout;
};
