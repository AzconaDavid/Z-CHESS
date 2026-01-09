
import { PieceType, PieceColor, Square, BoardState } from '../types';

export const isMoveLegal = (
  type: PieceType,
  color: PieceColor,
  from: Square,
  to: Square,
  board: BoardState
): boolean => {
  if (from.rank === to.rank && from.file === to.file) return false;
  
  const targetPiece = board[to.rank][to.file];
  if (targetPiece && targetPiece.color === color) return false;

  const dr = to.rank - from.rank;
  const df = to.file - from.file;
  const absDr = Math.abs(dr);
  const absDf = Math.abs(df);

  switch (type) {
    case 'p':
      const direction = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      
      // Move forward
      if (df === 0 && !targetPiece) {
        if (dr === direction) return true;
        if (dr === 2 * direction && from.rank === startRank && !board[from.rank + direction][from.file]) return true;
      }
      // Capture
      if (absDf === 1 && dr === direction && targetPiece) return true;
      return false;

    case 'r':
      if (dr !== 0 && df !== 0) return false;
      return isPathClear(from, to, board);

    case 'n':
      return (absDr === 2 && absDf === 1) || (absDr === 1 && absDf === 2);

    case 'b':
      if (absDr !== absDf) return false;
      return isPathClear(from, to, board);

    case 'q':
      if (dr !== 0 && df !== 0 && absDr !== absDf) return false;
      return isPathClear(from, to, board);

    case 'k':
      return absDr <= 1 && absDf <= 1;

    default:
      return false;
  }
};

const isPathClear = (from: Square, to: Square, board: BoardState): boolean => {
  const dr = Math.sign(to.rank - from.rank);
  const df = Math.sign(to.file - from.file);
  let r = from.rank + dr;
  let f = from.file + df;

  while (r !== to.rank || f !== to.file) {
    if (board[r][f]) return false;
    r += dr;
    f += df;
  }
  return true;
};

export const findKing = (board: BoardState, color: PieceColor): Square | null => {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.type === 'k' && p.color === color) {
        return { rank: r, file: f };
      }
    }
  }
  return null;
};

export const isSquareAttacked = (square: Square, attackerColor: PieceColor, board: BoardState): boolean => {
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece.color === attackerColor) {
        if (isMoveLegal(piece.type, piece.color, { rank: r, file: f }, square, board)) {
          return true;
        }
      }
    }
  }
  return false;
};

export const isKingInCheck = (board: BoardState, color: PieceColor): boolean => {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const attackerColor = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(kingPos, attackerColor, board);
};

export const isInsufficientMaterial = (board: BoardState): boolean => {
  const pieces: { type: PieceType; color: PieceColor }[] = [];
  
  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        pieces.push({ type: piece.type, color: piece.color });
      }
    }
  }

  if (pieces.length === 2) return true;

  if (pieces.length === 3) {
    return pieces.some(p => p.type === 'n' || p.type === 'b');
  }
  
  return false;
};
