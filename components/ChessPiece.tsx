
import React, { useEffect, useState } from 'react';
import { PieceType, PieceColor, UserPreferences } from '../types';

interface ChessPieceProps {
  type: PieceType;
  color: PieceColor;
  cooldownUntil: number;
  totalCooldown: number;
  pieceSet: UserPreferences['pieceSet'];
}

const pieceIcons: Record<PieceColor, Record<PieceType, string>> = {
  w: {
    p: 'fa-chess-pawn',
    r: 'fa-chess-rook',
    n: 'fa-chess-knight',
    b: 'fa-chess-bishop',
    q: 'fa-chess-queen',
    k: 'fa-chess-king',
  },
  b: {
    p: 'fa-chess-pawn',
    r: 'fa-chess-rook',
    n: 'fa-chess-knight',
    b: 'fa-chess-bishop',
    q: 'fa-chess-queen',
    k: 'fa-chess-king',
  },
};

const ChessPiece: React.FC<ChessPieceProps> = ({ type, color, cooldownUntil, totalCooldown, pieceSet }) => {
  const [cooldownPercent, setCooldownPercent] = useState(0);
  const [remainingSecs, setRemainingSecs] = useState(0);

  useEffect(() => {
    let interval: any;
    const update = () => {
      const now = Date.now();
      const remaining = cooldownUntil - now;
      if (remaining > 0) {
        setCooldownPercent((remaining / totalCooldown) * 100);
        setRemainingSecs(remaining / 1000);
      } else {
        setCooldownPercent(0);
        setRemainingSecs(0);
        clearInterval(interval);
      }
    };

    if (cooldownUntil > Date.now()) {
      interval = setInterval(update, 50);
      update();
    } else {
      setCooldownPercent(0);
      setRemainingSecs(0);
    }

    return () => clearInterval(interval);
  }, [cooldownUntil, totalCooldown]);

  // Visual variants based on pieceSet
  let setStyle = "";
  if (pieceSet === 'modern') {
    setStyle = color === 'w' 
      ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] text-cyan-50" 
      : "drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] text-rose-100";
  } else if (pieceSet === 'medieval') {
    setStyle = color === 'w'
      ? "text-amber-50 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
      : "text-stone-800 drop-shadow-[2px_2px_0px_rgba(255,255,255,0.2)]";
  } else {
    // Standard
    setStyle = color === 'w' 
      ? 'text-white drop-shadow-md' 
      : 'text-slate-900 drop-shadow-[0_2px_2px_rgba(255,255,255,0.5)]';
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform hover:scale-110 ${pieceSet === 'medieval' ? 'font-serif' : ''}`}>
      <i className={`fas ${pieceIcons[color][type]} text-3xl md:text-5xl ${setStyle} z-10 transition-all duration-300`}></i>
      
      {cooldownPercent > 0 && (
        <>
          <div 
            className="cooldown-overlay" 
            style={{ height: `${cooldownPercent}%` }} 
          />
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span className="cooldown-text text-white font-bold text-xs md:text-sm bg-black/40 px-1 rounded">
              {remainingSecs.toFixed(1)}s
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default ChessPiece;
