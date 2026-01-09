
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  cooldownUntil: number;
}

export interface Square {
  rank: number;
  file: number;
}

export type BoardState = (Piece | null)[][];

export interface GameStats {
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  fastestCheckmate: number;
}

export interface UserPreferences {
  username: string;
  boardTheme: 'classic' | 'neon' | 'wood' | 'midnight';
  pieceSet: 'standard' | 'medieval' | 'modern';
  cooldownTime: number; // in milliseconds
  showMoveHints: boolean;
}

export enum GameStatus {
  PLAYING = 'PLAYING',
  CHECKMATE = 'CHECKMATE',
  STALEMATE = 'STALEMATE',
  DRAW = 'DRAW'
}

export type GameMode = 'IA' | 'ONLINE' | 'LOCAL';

export interface GameSession {
  mode: GameMode;
  roomId?: string;
  isHost: boolean;
  opponentName: string;
}

export interface MoveRecord {
  pieceType: PieceType;
  pieceColor: PieceColor;
  from: Square;
  to: Square;
  timestamp: number;
}
